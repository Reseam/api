import { createHmac } from "node:crypto";
import type { Config } from "./config";
import type { Announcement } from "./schemas/announcements";
import type { Request } from "./schemas/requests";

export type RelayEvent = { type: "announcement"; announcement: Announcement } | { type: "request"; request: Request };
export type Relay = (event: RelayEvent) => void;

// A failed delivery is logged and dropped: a post on the socials never fails the write that caused it.
export function createRelay(config: Config, fetcher: typeof fetch): Relay {
  return (event) => {
    if (!config.relayUrl || !config.relaySecret) return;
    const body = JSON.stringify(event);
    const signature = createHmac("sha256", config.relaySecret).update(body).digest("hex");
    fetcher(`${config.relayUrl}/v1/api`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Reseam-Signature": signature },
      body,
    })
      .then((response) => {
        if (!response.ok) console.error(`relay answered ${response.status} for ${event.type}`);
      })
      .catch((error: Error) => console.error(`relay: ${error.message}`));
  };
}
