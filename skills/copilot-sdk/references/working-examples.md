# Complete Working Examples

**Critical:** Register event handlers **before** calling `send()` to capture all events.

## TypeScript/Node.js

```typescript
import { CopilotClient, SessionEvent } from "@github/copilot-sdk";

async function main() {
  const client = new CopilotClient();
  await client.start();

  const session = await client.createSession({
    model: "gpt-5",
    streaming: true,
  });

  const done = new Promise<string>((resolve) => {
    let content = "";

    // Register handler BEFORE send()
    session.on((event: SessionEvent) => {
      if (event.type === "assistant.message_delta") {
        process.stdout.write(event.data.deltaContent ?? "");
      }
      if (event.type === "assistant.message") {
        content = event.data.content ?? "";
      }
      if (event.type === "session.idle") {
        resolve(content);
      }
    });
  });

  await session.send({ prompt: "What is 2 + 2?" });
  const response = await done;

  console.log("\n\nFinal response:", response);

  await session.destroy();
  await client.stop();
}

main();
```

## Python

```python
import asyncio
from copilot import CopilotClient

async def main():
    client = CopilotClient()
    await client.start()

    session = await client.create_session({
        "model": "gpt-5",
        "streaming": True,
    })

    done = asyncio.Event()
    final_content = ""

    def on_event(event):
        nonlocal final_content
        # Access type via .value for the string
        event_type = event.type.value

        if event_type == "assistant.message_delta":
            print(event.data.delta_content, end="", flush=True)
        elif event_type == "assistant.message":
            final_content = event.data.content
        elif event_type == "session.idle":
            done.set()

    # Register handler BEFORE send()
    session.on(on_event)

    await session.send({"prompt": "What is 2 + 2?"})
    await done.wait()

    print(f"\n\nFinal response: {final_content}")

    await session.destroy()
    await client.stop()

asyncio.run(main())
```

## Go

```go
package main

import (
    "fmt"
    copilot "github.com/github/copilot-sdk/go"
)

func main() {
    client := copilot.NewClient(nil)
    if err := client.Start(); err != nil {
        panic(err)
    }
    defer client.Stop()

    session, err := client.CreateSession(&copilot.SessionConfig{
        Model:     "gpt-5",
        Streaming: true,
    })
    if err != nil {
        panic(err)
    }
    defer session.Destroy()

    done := make(chan string)
    var finalContent string

    // Register handler BEFORE Send()
    session.On(func(event copilot.SessionEvent) {
        switch event.Type {
        case "assistant.message_delta":
            if event.Data.DeltaContent != nil {
                fmt.Print(*event.Data.DeltaContent)
            }
        case "assistant.message":
            if event.Data.Content != nil {
                finalContent = *event.Data.Content
            }
        case "session.idle":
            done <- finalContent
        }
    })

    _, err = session.Send(copilot.MessageOptions{Prompt: "What is 2 + 2?"})
    if err != nil {
        panic(err)
    }

    response := <-done
    fmt.Printf("\n\nFinal response: %s\n", response)
}
```

## .NET (C#)

```csharp
using GitHub.Copilot.SDK;

await using var client = new CopilotClient();
await client.StartAsync();

await using var session = await client.CreateSessionAsync(new SessionConfig
{
    Model = "gpt-5",
    Streaming = true
});

var done = new TaskCompletionSource<string>();
var finalContent = "";

// Register handler BEFORE SendAsync()
session.On(evt =>
{
    switch (evt)
    {
        case AssistantMessageDeltaEvent delta:
            Console.Write(delta.Data.DeltaContent);
            break;
        case AssistantMessageEvent msg:
            finalContent = msg.Data.Content ?? "";
            break;
        case SessionIdleEvent:
            done.SetResult(finalContent);
            break;
    }
});

await session.SendAsync(new MessageOptions { Prompt = "What is 2 + 2?" });
var response = await done.Task;

Console.WriteLine($"\n\nFinal response: {response}");
```

---

# Custom Tools

The SDK allows defining tools that Copilot can invoke during conversations.

## TypeScript (using Zod)

```typescript
import { defineTool } from "@github/copilot-sdk";
import { z } from "zod";

const myTool = defineTool("lookup_issue", {
  description: "Fetch issue details from tracker",
  parameters: z.object({
    id: z.string().describe("Issue identifier"),
  }),
  handler: async ({ id }) => {
    // Implementation
    return { status: "found", title: "Bug report" };
  },
});

// Use in session
const session = await client.createSession({
  model: "gpt-5",
  tools: [myTool],
});
```

## Python (using Pydantic)

```python
from pydantic import BaseModel, Field
from copilot import CopilotClient, define_tool

class IssueParams(BaseModel):
    id: str = Field(description="Issue identifier")

@define_tool(description="Fetch issue details from tracker")
async def lookup_issue(params: IssueParams) -> dict:
    return {"status": "found", "title": "Bug report"}

# Use in session
session = await client.create_session({
    "model": "gpt-5",
    "tools": [lookup_issue],
})
```

## Go (using DefineTool)

```go
type IssueParams struct {
    ID string `json:"id" description:"Issue identifier"`
}

tool := copilot.DefineTool("lookup_issue", "Fetch issue details from tracker",
    func(params IssueParams, inv copilot.ToolInvocation) (any, error) {
        return map[string]string{"status": "found", "title": "Bug report"}, nil
    })

// Use in session
session, _ := client.CreateSession(&copilot.SessionConfig{
    Model: "gpt-5",
    Tools: []copilot.Tool{tool},
})
```

## .NET (using AIFunctionFactory)

```csharp
using Microsoft.Extensions.AI;

var tool = AIFunctionFactory.Create(
    (string id) => new { Status = "found", Title = "Bug report" },
    "lookup_issue",
    "Fetch issue details from tracker"
);

// Use in session
var session = await client.CreateSessionAsync(new SessionConfig
{
    Model = "gpt-5",
    Tools = new[] { tool }
});
```
