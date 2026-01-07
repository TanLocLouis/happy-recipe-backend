import { model } from "../utils/gemini.js";
import { openai, SYSTEM_PROMPT } from "../utils/openai.js";

export async function chatAI(req, res) {
  try {
    const { chatList } = req.body || {};

    if (!Array.isArray(chatList) || chatList.length === 0) {
      return res.status(400).json({ error: "chatList is required and must be a non-empty array" });
    }

    // Use at most 10 recent messages; assume last item is the latest user message
    // const recent = chatList.slice(-10);
    const lastMsg = chatList[chatList.length - 1];
    if (!lastMsg || lastMsg.role !== "user" || typeof lastMsg.content !== "string") {
      return res
        .status(400)
        .json({ error: "Last chat message must be a user message with content" });
    }

    const formattedHistory = chatList.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Build history excluding the latest user message, mapping roles to Gemini chat roles
    // const history = recent.slice(0, -1).map((m) => ({
    //   role: m.role === "assistant" ? "model" : "user",
    //   parts: [{ text: String(m.content || "") }],
    // }));

    // console.log("[DEBUG] Gemini chat history:", history);

    // Start chat with history and send the latest user message

    console.log("[DEBUG]", formattedHistory);
    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(String(lastMsg.content));
    const text = result.response.text();

    console.log("[DEBUG] Gemini raw response text:", text);
    // Try to parse JSON as suggested; otherwise return raw text for debugging
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        console.log("[DEBUG] AI response data:", data);
        return res.status(200).json(data);
      } else {
        return res.status(500).json({ error: "Invalid AI response format", raw: text });
      }
    } catch (parseErr) {
      return res.status(500).json({ error: "Invalid AI response format", raw: text });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "AI service error" });
  }
}

export async function chatOpenAI(req, res) {
  try {
    const { chatList } = req.body || {};

    if (!Array.isArray(chatList) || chatList.length === 0) {
      return res.status(400).json({ error: "chatList is required and must be a non-empty array" });
    }

    // Use at most 10 recent messages; assume last item is the latest user message
    const recent = chatList.slice(-10);
    const lastMsg = recent[recent.length - 1];
    if (!lastMsg || lastMsg.role !== "user" || typeof lastMsg.content !== "string") {
      return res
        .status(400)
        .json({ error: "Last chat message must be a user message with content" });
    }

    // Build messages for OpenAI: include system prompt, then history
    const messages = [
      ...recent.map((m) => ({
        role: m.role,
        content: String(m.content || ""),
      })),
    ];

    // Check that messages length does not exceed model limits (e.g., 4096 tokens)
    // This is a simplified check; in production, consider using a tokenizer to count tokens accurately
    const totalLength = messages.reduce((acc, msg) => acc + msg.content.length, 0);
    if (totalLength > 1000) {
      // Approximate limit for gpt-4o-mini
      return res.status(400).json({ error: "Chat history exceeds maximum allowed length" });
    }

    // Call OpenAI with chat history
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      instructions: SYSTEM_PROMPT,
      input: messages,
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            reply: { type: "string", description: "Information about the recipe" },
            redirect: { type: "string", description: "Title of the recipe" },
          },
          required: ["reply", "redirect"],
        },
      },
    });

    const text = completion.choices[0].message.content;

    console.log("[DEBUG] OpenAI raw response text:", text);

    // Try to parse JSON response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        console.log("[DEBUG] AI response data:", data);
        return res.status(200).json(data);
      } else {
        return res.status(500).json({ error: "Invalid AI response format", raw: text });
      }
    } catch (parseErr) {
      return res.status(500).json({ error: "Invalid AI response format", raw: text });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "OpenAI service error" });
  }
}
