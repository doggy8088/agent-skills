# Event System

## Event Lifecycle

Events fire in this typical sequence for a single request:

```
1. user.message              → User prompt recorded
2. assistant.turn_start      → Model begins processing
3. session.usage_info        → Token/usage metadata
4. assistant.message_delta   → Streaming chunks (if enabled, repeats)
5. assistant.message         → Final complete response
6. assistant.reasoning       → Chain-of-thought (if available)
7. assistant.turn_end        → Model finished processing
8. session.idle              → Session ready for next prompt
```

When tools are invoked, additional events appear:
```
   tool.execution_start      → Tool invocation began
   tool.execution_end        → Tool execution completed
```

## SessionEvent Structure

Events are wrapped in a `SessionEvent` object (exact field names vary by language):

```
SessionEvent {
  type: string | enum       // Event type identifier
  data: {                   // Event-specific payload
    content?: string        // Full text (final events)
    deltaContent?: string   // Incremental text (delta events)
    // Other fields vary by event type
  }
  id?: string               // Event identifier
  timestamp?: string        // When event occurred
}
```

**Important access patterns:**
- TypeScript: `event.type` (string), `event.data.content`, `event.data.deltaContent`
- Python: `event.type.value` (enum requires `.value`), `event.data.content`, `event.data.delta_content`
- Go: `event.Type` (string), `*event.Data.Content`, `*event.Data.DeltaContent` (pointers)
- .NET: Pattern match on event class, then `evt.Data.Content`, `evt.Data.DeltaContent`

## Event Types Reference

| Event Type | Purpose | Key Data Fields |
|------------|---------|-----------------|
| `user.message` | User input recorded | `content` |
| `assistant.message` | Complete response | `content` |
| `assistant.message_delta` | Streaming chunk | `deltaContent` / `delta_content` |
| `assistant.reasoning` | Chain-of-thought | `content` |
| `assistant.reasoning_delta` | Reasoning chunk | `deltaContent` / `delta_content` |
| `assistant.turn_start` | Processing began | — |
| `assistant.turn_end` | Processing finished | — |
| `tool.execution_start` | Tool invoked | tool name, parameters |
| `tool.execution_end` | Tool completed | result |
| `session.idle` | Ready for next prompt | — |
| `session.usage_info` | Token/usage data | usage metrics |

## Streaming Behavior

The `streaming` configuration option controls **when** content arrives, not **which** events fire:

| Setting | Behavior |
|---------|----------|
| `streaming: false` (default) | Content arrives all at once in `assistant.message` |
| `streaming: true` | Content arrives incrementally via `assistant.message_delta` events |

**Important:** Final events (`assistant.message`, `assistant.reasoning`) **always fire** regardless of streaming setting. They contain the complete accumulated content.

To build a response progressively:
1. Accumulate `deltaContent` from each `assistant.message_delta` event
2. Or wait for `assistant.message` which contains the complete text

---

# Language-Specific Conventions

| Concept | TypeScript | Python | Go | .NET |
|---------|------------|--------|----|----|
| Client class | `CopilotClient` | `CopilotClient` | `Client` | `CopilotClient` |
| Create session | `createSession()` | `create_session()` | `CreateSession()` | `CreateSessionAsync()` |
| Send message | `send()` / `sendAndWait()` | `send()` / `send_and_wait()` | `Send()` | `SendAsync()` |
| Session config | `{ model, streaming }` | `{"model", "streaming"}` | `&SessionConfig{}` | `new SessionConfig{}` |
| Event handler | `session.on(fn)` | `session.on(fn)` | `session.On(fn)` | `session.On(fn)` |
| Delta content | `deltaContent` | `delta_content` | `DeltaContent` | `DeltaContent` |
| System message | `systemMessage` | `system_message` | `SystemMessage` | `SystemMessage` |
| CLI path option | `cliPath` | `cli_path` | `CLIPath` | `CliPath` |
