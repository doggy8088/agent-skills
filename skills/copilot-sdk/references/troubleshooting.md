# Troubleshooting

## Common Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Events fire but content is empty | Accessing wrong property | Use `event.data.content`, not `event.content` |
| Handler never fires | Registered after `send()` | Register handler **before** calling `send()` |
| `get_messages()` returns events, not messages | Method returns all `SessionEvent` objects | Filter by `event.type` and extract from `.data` |
| Response in console but not captured | SDK logs internally | Capture via event handler, not console output |
| Python: `event.type` returns enum object | Enum needs `.value` | Use `event.type.value` for the string |
| Go: nil pointer dereference | Content fields are pointers | Check `!= nil` before dereferencing |

## Event Handler Timing

**Correct pattern:**
```
1. Create session
2. Register event handler(s)
3. Call send()
4. Wait for session.idle or use sendAndWait()
```

**Incorrect pattern (misses events):**
```
1. Create session
2. Call send()
3. Register event handler  ← Too late, events already fired
```

## Debugging Events

To inspect all events during development:

**TypeScript:**
```typescript
session.on((event) => {
  console.log(JSON.stringify(event, null, 2));
});
```

**Python:**
```python
def debug_handler(event):
    print(f"Event: {event.type.value}")
    print(f"Data: {event.data}")

session.on(debug_handler)
```

**Go:**
```go
session.On(func(event copilot.SessionEvent) {
    fmt.Printf("Event: %s\n", event.Type)
    fmt.Printf("Data: %+v\n", event.Data)
})
```

**C#:**
```csharp
session.On(evt => {
    Console.WriteLine($"Event: {evt.GetType().Name}");
});
```
