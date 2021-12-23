export interface PhishermanUnknownDomain {
  classification: "unknown";
}

export interface PhishermanDomainInfo {
  verifiedPhish: boolean;
  classification: "safe" | "malicious";
}
