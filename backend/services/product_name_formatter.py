"""
Industry-standard hardware product-name normalizer.

Mirrors the frontend `formatProductName.js` so that the backend stores
correctly-cased names and both sides agree.

Rules:
  1. Known IT/networking acronyms are always written in their canonical form.
  2. Common small words (articles, prepositions) stay lowercase unless first.
  3. Everything else gets standard Title Case.
  4. Hyphens are preserved; each sub-token is checked independently.
  5. Numbers are left as-is; number+unit combos (e.g. "48port") are split.
"""

import re
from typing import Optional

# ---------------------------------------------------------------------------
# Canonical term table  (lowercase key → canonical display value)
# ---------------------------------------------------------------------------
KNOWN_TERMS: dict[str, str] = {
    # Power over Ethernet
    "poe":   "PoE",
    "poe+":  "PoE+",
    "upoe":  "UPoE",
    "upoe+": "UPoE+",

    # Interface / media types
    "sfp":    "SFP",
    "sfp+":   "SFP+",
    "sfp28":  "SFP28",
    "qsfp":   "QSFP",
    "qsfp+":  "QSFP+",
    "qsfp28": "QSFP28",
    "qsfp-dd":"QSFP-DD",
    "gbic":   "GBIC",
    "xfp":    "XFP",
    "cfp":    "CFP",
    "cfp2":   "CFP2",
    "cfp4":   "CFP4",

    # Speed / size suffixes
    "gbps": "Gbps",
    "mbps": "Mbps",
    "tbps": "Tbps",
    "ghz":  "GHz",
    "mhz":  "MHz",
    "khz":  "KHz",
    "gb":   "GB",
    "tb":   "TB",
    "mb":   "MB",
    "kb":   "KB",

    # Ethernet generation shorthand
    "1ge":   "1GE",
    "10ge":  "10GE",
    "25ge":  "25GE",
    "40ge":  "40GE",
    "100ge": "100GE",
    "400ge": "400GE",

    # OEM brands
    "cisco":      "Cisco",
    "juniper":    "Juniper",
    "aruba":      "Aruba",
    "hpe":        "HPE",
    "hp":         "HP",
    "dell":       "Dell",
    "lenovo":     "Lenovo",
    "netgear":    "NETGEAR",
    "ubiquiti":   "Ubiquiti",
    "unifi":      "UniFi",
    "fortinet":   "Fortinet",
    "fortigate":  "FortiGate",
    "fortiswitch":"FortiSwitch",
    "fortiap":    "FortiAP",
    "meraki":     "Meraki",
    "arista":     "Arista",
    "extreme":    "Extreme",
    "brocade":    "Brocade",
    "ruckus":     "Ruckus",
    "huawei":     "Huawei",
    "tp-link":    "TP-Link",
    "tplink":     "TP-Link",
    "mikrotik":   "MikroTik",
    "zyxel":      "ZyXEL",
    "linksys":    "Linksys",
    "d-link":     "D-Link",
    "dlink":      "D-Link",
    "tenda":      "Tenda",

    # Cisco product families
    "catalyst":   "Catalyst",
    "nexus":      "Nexus",
    "asr":        "ASR",
    "isr":        "ISR",
    "ncs":        "NCS",
    "ucs":        "UCS",
    "aironet":    "Aironet",
    "stackwise":  "StackWise",
    "flexstack":  "FlexStack",

    # HPE / Aruba
    "procurve":   "ProCurve",
    "comware":    "Comware",
    "flexfabric": "FlexFabric",

    # Juniper
    "junos": "Junos",
    "qfx":   "QFX",
    "ex":    "EX",
    "mx":    "MX",
    "srx":   "SRX",
    "ptx":   "PTX",
    "acx":   "ACX",

    # Generic IT / protocol acronyms
    "lan":  "LAN",
    "wan":  "WAN",
    "wlan": "WLAN",
    "vlan": "VLAN",
    "vpn":  "VPN",
    "mpls": "MPLS",
    "ospf": "OSPF",
    "bgp":  "BGP",
    "dhcp": "DHCP",
    "dns":  "DNS",
    "nat":  "NAT",
    "acl":  "ACL",
    "qos":  "QoS",
    "ids":  "IDS",
    "ips":  "IPS",
    "idps": "IDPS",
    "utm":  "UTM",
    "ssl":  "SSL",
    "tls":  "TLS",
    "ip":   "IP",
    "tcp":  "TCP",
    "udp":  "UDP",
    "ipv4": "IPv4",
    "ipv6": "IPv6",
    "voip": "VoIP",
    "usb":  "USB",
    "ssd":  "SSD",
    "hdd":  "HDD",
    "ram":  "RAM",
    "cpu":  "CPU",
    "gpu":  "GPU",
    "led":  "LED",
    "lcd":  "LCD",
    "hdmi": "HDMI",
    "vga":  "VGA",
    "dvi":  "DVI",
    "pci":  "PCI",
    "pcie": "PCIe",
    "sata": "SATA",
    "nvme": "NVMe",
    "raid": "RAID",

    # Articles / prepositions → keep lowercase (unless first word)
    "with": "with",
    "and":  "and",
    "or":   "or",
    "for":  "for",
    "of":   "of",
    "the":  "the",
    "a":    "a",
    "an":   "an",
    "in":   "in",
    "on":   "on",
    "at":   "at",
    "to":   "to",
    "by":   "by",
}

_NUM_UNIT_RE = re.compile(r'^(\d+)([a-zA-Z+]+)$')


def _normalize_token(token: str, is_first: bool = False) -> str:
    """Normalize a single whitespace-free token."""
    lower = token.lower()

    # Direct lookup
    if lower in KNOWN_TERMS:
        canonical = KNOWN_TERMS[lower]
        # Force capitalize if it's the first token and a small-word
        if is_first and canonical[0].islower():
            return canonical[0].upper() + canonical[1:]
        return canonical

    # Hyphenated compound – recurse on each part
    if "-" in token:
        parts = token.split("-")
        return "-".join(
            _normalize_token(p, is_first=(i == 0 and is_first))
            for i, p in enumerate(parts)
        )

    # Pure number
    if token.isdigit():
        return token

    # Number + unit suffix  e.g. "48port", "10G"
    m = _NUM_UNIT_RE.match(token)
    if m:
        num_part, unit_part = m.group(1), m.group(2)
        unit_lower = unit_part.lower()
        canonical_unit = KNOWN_TERMS.get(unit_lower, unit_part[0].upper() + unit_part[1:].lower())
        return num_part + canonical_unit

    # Default: Title Case
    return token[0].upper() + token[1:].lower() if token else token


def format_product_name(name: Optional[str]) -> Optional[str]:
    """
    Format a hardware product name to industry-standard casing.
    Safe to call with None or empty strings.
    """
    if not name:
        return name
    name = name.strip()
    if not name:
        return name

    tokens = re.split(r'(\s+)', name)  # preserves whitespace chunks
    result = []
    word_index = 0
    for chunk in tokens:
        if re.match(r'^\s+$', chunk):
            result.append(chunk)
        else:
            result.append(_normalize_token(chunk, is_first=(word_index == 0)))
            word_index += 1
    return "".join(result)
