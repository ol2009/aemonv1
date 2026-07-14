export function getChatReplyDelay(message: string) {
  return Math.min(2200, 1000 + Array.from(message).length * 18)
}

export function waitForChatReply(message: string) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, getChatReplyDelay(message))
  })
}
