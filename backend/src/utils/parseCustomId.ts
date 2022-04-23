const customIdFormat = /^([^:]+):\d+:(.*)$/;

export function parseCustomId(customId: string): { namespace: string; data: any } {
  const parts = customId.match(customIdFormat);
  if (!parts) {
    return {
      namespace: "",
      data: null,
    };
  }

  return {
    namespace: parts[1],
    // Skipping timestamp
    data: JSON.parse(parts[2]),
  };
}
