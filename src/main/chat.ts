import { ChatMessage, Block, OpenAIResponse } from './types';

const FORMAT_INSTRUCTION_MARKDOWN = `Please assist by reading and responding in Markdown syntax used by Logseq's blocks, with the following additional notes:
* Use \`*\` for lists instead of \`-\`.
* Avoid using headings like \`#\`, \`##\`, etc.
* Avoid nesting lists.
* Avoid using sub-items.`;

const FORMAT_INSTRUCTION_ORG = `Please assist by reading and responding in Org mode syntax used by Logseq's blocks, with the following additional notes:
- Markup examples:
  #+BEGIN_SRC org
  *bold*, =verbatim=, /italic/, +strikethrough+, _underline_, ~code~, [[protocal://some.domain][some label]]
  #+END_SRC
- Note that bold uses single ~*~ to quote,, i.e. ~*bold*~ instead of ~**bold**~.
- Avoid using headings.
- Avoid nesting lists.
* Avoid using sub-items.
- Avoid quoting the entire response in a greater block.`;

export function augmentSystemMessage(systemMessage: string, format: string): string {
  let formatInstruction: string | null = null;
  
  switch (format) {
    case 'markdown':
      formatInstruction = FORMAT_INSTRUCTION_MARKDOWN;
      break;
    case 'org':
      formatInstruction = FORMAT_INSTRUCTION_ORG;
      break;
    default:
      formatInstruction = null;
  }
  
  return formatInstruction ? `${systemMessage} ${formatInstruction}` : systemMessage;
}

export function prependPropertyStr(format: string, model: string, s: string): string {
  let propertyStr: string | null = null;
  
  switch (format) {
    case 'markdown':
      propertyStr = `chatseq-model:: ${model}`;
      break;
    case 'org':
      propertyStr = `:PROPERTIES:\n:chatseq-model: ${model}\n:END:`;
      break;
    default:
      propertyStr = null;
  }
  
  return propertyStr ? propertyStr + s : s;
}

export function removePropertyStr(format: string, s: string): string {
  let pattern: RegExp | null = null;
  
  switch (format) {
    case 'markdown':
      pattern = /^chatseq-model:: .+\n/;
      break;
    case 'org':
      pattern = /^:PROPERTIES:\n:chatseq-model: .+\n:END:\n/;
      break;
    default:
      pattern = null;
  }
  
  return pattern ? s.replace(pattern, '') : s;
}

export function getMessageContent(response: OpenAIResponse): string {
  return response.choices[0]?.message?.content || '';
}

export function getDeltaContent(chunk: OpenAIResponse): string {
  return chunk.choices[0]?.delta?.content || '';
}

export function childBlockToMessage(
  childBlock: Block,
  format: string,
  currentUuid: string,
  currentContent: string
): ChatMessage {
  const { uuid, content, properties } = childBlock;
  const propertyValue = properties?.chatseqModel;
  
  if (propertyValue) {
    return {
      role: 'assistant',
      content: removePropertyStr(format, content)
    };
  } else if (uuid === currentUuid) {
    return {
      role: 'user',
      content: currentContent
    };
  } else {
    return {
      role: 'user',
      content
    };
  }
}