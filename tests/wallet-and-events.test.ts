import { describe, expect, it } from "vitest";
import { eventHub } from "../apps/api/src/lib/events.js";

describe("Real-time Event Hub (lib/events.ts)", () => {
  it("delivers events to subscribed users with strict user isolation", () => {
    const receivedUser1: any[] = [];
    const receivedUser2: any[] = [];

    const mockReply1: any = {
      raw: {
        writableEnded: false,
        destroyed: false,
        write: (str: string) => {
          receivedUser1.push(str);
        },
        on: () => {},
      },
    };

    const mockReply2: any = {
      raw: {
        writableEnded: false,
        destroyed: false,
        write: (str: string) => {
          receivedUser2.push(str);
        },
        on: () => {},
      },
    };

    const unsub1 = eventHub.subscribe("user_test_1", mockReply1);
    const unsub2 = eventHub.subscribe("user_test_2", mockReply2);

    // Initial connected event received by both
    expect(receivedUser1.length).toBeGreaterThan(0);
    expect(receivedUser1[0]).toContain("system.connected");
    expect(receivedUser2.length).toBeGreaterThan(0);
    expect(receivedUser2[0]).toContain("system.connected");

    // Publish event for user 1 ONLY
    eventHub.publish("user_test_1", "wallet.balance.updated", {
      balancePaise: 50000,
      balanceFormatted: "₹500.00",
    });

    const user1Messages = receivedUser1.join("\n");
    const user2Messages = receivedUser2.join("\n");

    expect(user1Messages).toContain("wallet.balance.updated");
    expect(user1Messages).toContain("50000");
    // User 2 MUST NOT receive User 1's financial data
    expect(user2Messages).not.toContain("wallet.balance.updated");

    unsub1();
    unsub2();
  });

  it("replays missed events when Last-Event-ID is provided", () => {
    const userA = `user_replay_${Date.now()}`;
    const evt1 = eventHub.publish(userA, "wallet.balance.updated", { balancePaise: 10000 });
    const evt2 = eventHub.publish(userA, "ledger.entry.created", { amountPaise: 10000 });

    const received: string[] = [];
    const mockReply: any = {
      raw: {
        writableEnded: false,
        destroyed: false,
        write: (str: string) => {
          received.push(str);
        },
        on: () => {},
      },
    };

    // Connect with Last-Event-ID = evt1.id -> should replay evt2
    const unsub = eventHub.subscribe(userA, mockReply, evt1.id);
    const combined = received.join("\n");

    expect(combined).toContain("ledger.entry.created");
    unsub();
  });
});
