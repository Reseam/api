import { Value } from "@sinclair/typebox/value";
import { t, type TSchema } from "elysia";
import type { Config } from "./config";

const ENDPOINT = "https://openrouter.ai/api/v1/systemone";
const SPAM_AT = 0.85;
const DUPLICATE_AT = 0.85;
const APP_AT = 0.6;
const NONE = "none";

const AnswersSchema = t.Object({
  answers: t.Object({
    spam: t.Object({ noul: t.Number() }),
    duplicate: t.Optional(t.Object({ choice: t.String(), probabilities: t.Record(t.String(), t.Number()) })),
    app: t.Optional(t.Object({ choice: t.String(), probabilities: t.Record(t.String(), t.Number()) })),
  }),
});

const CommentAnswersSchema = t.Object({ answers: t.Object({ spam: t.Object({ noul: t.Number() }) }) });

export type Submission = { title: string; body?: string; app?: string };
export type Candidate = { id: number; title: string };
export type Screening = { spam: boolean; duplicateOf: number | null; app: string | null };
export type Screener = {
  request(submission: Submission, candidates: Candidate[], packages: string[]): Promise<Screening>;
  /** Whether a comment is spam, ads or abuse instead of a reply about its request. */
  spamComment(comment: string, request: { title: string; body: string | null }): Promise<boolean>;
};

export function createScreener(config: Config, fetcher: typeof fetch): Screener | undefined {
  if (!config.openRouterApiKey) return undefined;

  const ask = async <S extends TSchema>(state: unknown, questions: unknown, schema: S) => {
    const response = await fetcher(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.openRouterApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.screeningModel, state, questions }),
    });
    if (!response.ok) throw new Error(`Screening returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
    return Value.Parse(schema, await response.json());
  };

  const request: Screener["request"] = async (submission, candidates, packages) => {
    const choice = (entries: [string, string][], none: string) => Object.fromEntries([[NONE, none], ...entries]);
    const questions = {
      spam: {
        type: "noul",
        instructions: "Is this spam, advertising, abuse, or anything other than a request for a feature, a fix, or support for an Android app in Reseam, a tool that patches Android apps?",
        criteria: { true: "Spam, advertising, abuse, or not a request", false: "A genuine request, however short or unclear" },
      },
      ...(candidates.length > 0 && {
        duplicate: {
          type: "choice",
          instructions: "Does the new request ask for the same thing as one of the open requests?",
          criteria: choice(candidates.map(({ id, title }) => [String(id), title]), "It asks for something none of them ask for"),
        },
      }),
      ...(!submission.app && packages.length > 0 && {
        app: {
          type: "choice",
          instructions: "Which Android app, by package name, is the new request about?",
          criteria: choice(packages.map((name) => [name, name]), "Another app, several apps, or no particular app"),
        },
      }),
    };

    const { answers } = await ask(
      { request: { title: submission.title, body: submission.body ?? "" } },
      questions,
      AnswersSchema,
    );

    const picked = (answer: { choice: string; probabilities: Record<string, number> } | undefined, at: number) =>
      answer && answer.choice !== NONE && (answer.probabilities[answer.choice] ?? 0) >= at ? answer.choice : null;
    const duplicate = picked(answers.duplicate, DUPLICATE_AT);
    return {
      spam: answers.spam.noul >= SPAM_AT,
      duplicateOf: duplicate === null ? null : Number(duplicate),
      app: picked(answers.app, APP_AT),
    };
  };

  const spamComment: Screener["spamComment"] = async (comment, request) => {
    const { answers } = await ask(
      { request: { title: request.title, body: request.body ?? "" }, comment },
      {
        spam: {
          type: "noul",
          instructions: "Is this comment spam, advertising, or abuse, instead of a reply about the request it is posted on?",
          criteria: { true: "Spam, advertising, or abuse", false: "A genuine reply, however short, critical or off the mark" },
        },
      },
      CommentAnswersSchema,
    );
    return answers.spam.noul >= SPAM_AT;
  };

  return { request, spamComment };
}
