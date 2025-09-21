export function createSttMock() {
  return {
    async transcribeBuffer(buffer) {
      const hash = buffer.length.toString(16);
      return {
        text: `Transcription simulée (${hash}) pour futur service STT.`,
        confidence: 0.42
      };
    }
  };
}
