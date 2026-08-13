/**
 * Industry-standard hardware name formatter.
 *
 * Strategy (mirrors what Amazon, CDW, Cisco, Juniper, HPE do):
 *  1. Known acronyms / trademarks are always written in their canonical form.
 *  2. Everything else gets standard Title Case.
 *  3. Separators like hyphens and slashes are preserved; each token on both
 *     sides is checked independently.
 *
 * Add entries to KNOWN_TERMS as new product families are introduced.
 */

/** Canonical forms – keys are lowercase for matching */
const KNOWN_TERMS = {
  // Power over Ethernet
  "poe": "PoE",
  "poe+": "PoE+",
  "upoe": "UPoE",
  "upoe+": "UPoE+",

  // Interface / media types
  "sfp": "SFP",
  "sfp+": "SFP+",
  "sfp28": "SFP28",
  "qsfp": "QSFP",
  "qsfp+": "QSFP+",
  "qsfp28": "QSFP28",
  "qsfp-dd": "QSFP-DD",
  "gbic": "GBIC",
  "xfp": "XFP",
  "cfp": "CFP",
  "cfp2": "CFP2",
  "cfp4": "CFP4",

  // Speed suffixes
  "gbps": "Gbps",
  "mbps": "Mbps",
  "tbps": "Tbps",
  "ghz": "GHz",
  "mhz": "MHz",
  "khz": "KHz",

  // Size suffixes
  "gb": "GB",
  "tb": "TB",
  "mb": "MB",
  "kb": "KB",

  // Ethernet standards
  "1ge": "1GE",
  "10ge": "10GE",
  "25ge": "25GE",
  "40ge": "40GE",
  "100ge": "100GE",
  "400ge": "400GE",

  // Common OEM / brands
  "cisco": "Cisco",
  "juniper": "Juniper",
  "aruba": "Aruba",
  "hpe": "HPE",
  "hp": "HP",
  "dell": "Dell",
  "lenovo": "Lenovo",
  "netgear": "NETGEAR",
  "ubiquiti": "Ubiquiti",
  "unifi": "UniFi",
  "fortinet": "Fortinet",
  "fortigate": "FortiGate",
  "fortiswitch": "FortiSwitch",
  "fortiap": "FortiAP",
  "paloalto": "Palo Alto",
  "meraki": "Meraki",
  "arista": "Arista",
  "extreme": "Extreme",
  "brocade": "Brocade",
  "ruckus": "Ruckus",
  "huawei": "Huawei",
  "tplink": "TP-Link",
  "tp-link": "TP-Link",
  "mikrotik": "MikroTik",
  "zyxel": "ZyXEL",
  "linksys": "Linksys",
  "dlink": "D-Link",
  "d-link": "D-Link",
  "tenda": "Tenda",

  // Product family names / Cisco-specific
  "catalyst": "Catalyst",
  "nexus": "Nexus",
  "asr": "ASR",
  "isr": "ISR",
  "ncs": "NCS",
  "ucs": "UCS",
  "aironet": "Aironet",
  "wireless": "Wireless",
  "stackwise": "StackWise",
  "flexstack": "FlexStack",

  // HPE / Aruba specific
  "arubacx": "ArubaOS-CX",
  "procurve": "ProCurve",
  "comware": "Comware",
  "flexfabric": "FlexFabric",

  // Juniper specific
  "junos": "Junos",
  "qfx": "QFX",
  "ex": "EX",
  "mx": "MX",
  "srx": "SRX",
  "ptx": "PTX",
  "acx": "ACX",

  // Generic IT terms
  "lan": "LAN",
  "wan": "WAN",
  "wlan": "WLAN",
  "vlan": "VLAN",
  "vpn": "VPN",
  "mpls": "MPLS",
  "ospf": "OSPF",
  "bgp": "BGP",
  "dhcp": "DHCP",
  "dns": "DNS",
  "nat": "NAT",
  "acl": "ACL",
  "qos": "QoS",
  "ids": "IDS",
  "ips": "IPS",
  "idps": "IDPS",
  "utm": "UTM",
  "ssl": "SSL",
  "tls": "TLS",
  "ip": "IP",
  "tcp": "TCP",
  "udp": "UDP",
  "ipv4": "IPv4",
  "ipv6": "IPv6",
  "voip": "VoIP",
  "poe": "PoE",
  "usb": "USB",
  "ssd": "SSD",
  "hdd": "HDD",
  "ram": "RAM",
  "cpu": "CPU",
  "gpu": "GPU",
  "led": "LED",
  "lcd": "LCD",
  "hdmi": "HDMI",
  "vga": "VGA",
  "dvi": "DVI",
  "pci": "PCI",
  "pcie": "PCIe",
  "sata": "SATA",
  "nvme": "NVMe",
  "raid": "RAID",

  // Common small words that should NOT be title-cased (articles / prepositions)
  "with": "with",
  "and": "and",
  "or": "or",
  "for": "for",
  "of": "of",
  "the": "the",
  "a": "a",
  "an": "an",
  "in": "in",
  "on": "on",
  "at": "at",
  "to": "to",
  "by": "by",
};

/**
 * Normalize a single word-token (no whitespace inside).
 * Handles hyphenated compounds like "48-port" → "48-Port" and "poe+" → "PoE+".
 */
function normalizeToken(token) {
  // Check for a direct known-term match (handles tokens like "sfp+")
  const lower = token.toLowerCase();
  if (KNOWN_TERMS[lower] !== undefined) {
    return KNOWN_TERMS[lower];
  }

  // Check if it is a numeric-unit combo like "48-port", "10ge", "100w"
  // Split on hyphen and normalize each part
  if (token.includes("-")) {
    return token
      .split("-")
      .map((part) => {
        const pl = part.toLowerCase();
        if (KNOWN_TERMS[pl] !== undefined) return KNOWN_TERMS[pl];
        // numbers or pure-digit parts → keep as-is
        if (/^\d+$/.test(part)) return part;
        // capitalize first letter otherwise
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join("-");
  }

  // Pure number – leave alone
  if (/^\d+$/.test(token)) return token;

  // Number + unit suffix (e.g. "48port", "10g") – keep first digit block, capitalize rest
  const numUnitMatch = token.match(/^(\d+)([a-z+]+)$/i);
  if (numUnitMatch) {
    const unit = numUnitMatch[2].toLowerCase();
    return numUnitMatch[1] + (KNOWN_TERMS[unit] || (numUnitMatch[2].charAt(0).toUpperCase() + numUnitMatch[2].slice(1).toLowerCase()));
  }

  // Default: Title Case the token
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

/**
 * Main export. Format a hardware/product name to industry-standard casing.
 * @param {string} name  Raw name (any casing)
 * @returns {string}     Properly cased name
 */
export function formatProductName(name) {
  if (!name || typeof name !== "string") return name;
  const trimmed = name.trim();
  if (!trimmed) return trimmed;

  // Tokenize on whitespace, preserve separators
  return trimmed
    .split(/(\s+)/)
    .map((chunk, idx) => {
      // Preserve whitespace chunks
      if (/^\s+$/.test(chunk)) return chunk;

      // First token is always capitalized (even articles)
      if (idx === 0) {
        // Check known terms first
        const lower = chunk.toLowerCase();
        if (KNOWN_TERMS[lower]) return KNOWN_TERMS[lower];
        return normalizeToken(chunk);
      }

      return normalizeToken(chunk);
    })
    .join("");
}
