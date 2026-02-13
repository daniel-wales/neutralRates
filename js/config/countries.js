export const countryCatalog = [
  { code: "egy", name: "Egypt", group: "Africa" },
  { code: "nga", name: "Nigeria", group: "Africa" },
  { code: "zaf", name: "South Africa", group: "Africa" },

  { code: "bgd", name: "Bangladesh", group: "Asia and Pacific" },
  { code: "idn", name: "Indonesia", group: "Asia and Pacific" },
  { code: "ind", name: "India", group: "Asia and Pacific" },
  { code: "jpn", name: "Japan", group: "Asia and Pacific" },
  { code: "kor", name: "South Korea", group: "Asia and Pacific" },
  { code: "mys", name: "Malaysia", group: "Asia and Pacific" },
  { code: "phl", name: "Philippines", group: "Asia and Pacific" },
  { code: "tha", name: "Thailand", group: "Asia and Pacific" },
  { code: "vnm", name: "Vietnam", group: "Asia and Pacific" },
  { code: "aus", name: "Australia", group: "Asia and Pacific" },
  { code: "nzl", name: "New Zealand", group: "Asia and Pacific" },

  { code: "blr", name: "Belarus", group: "Europe" },
  { code: "cze", name: "Czech Republic", group: "Europe" },
  { code: "gbr", name: "United Kingdom", group: "Europe" },
  { code: "hun", name: "Hungary", group: "Europe" },
  { code: "nor", name: "Norway", group: "Europe" },
  { code: "pol", name: "Poland", group: "Europe" },
  { code: "rou", name: "Romania", group: "Europe" },
  { code: "rus", name: "Russia", group: "Europe" },
  { code: "srb", name: "Serbia", group: "Europe" },
  { code: "swe", name: "Sweden", group: "Europe" },

  { code: "isr", name: "Israel", group: "Middle East and Central Asia" },
  { code: "pak", name: "Pakistan", group: "Middle East and Central Asia" },
  { code: "tur", name: "Turkey", group: "Middle East and Central Asia" },

  { code: "bra", name: "Brazil", group: "Western Hemisphere" },
  { code: "can", name: "Canada", group: "Western Hemisphere" },
  { code: "chl", name: "Chile", group: "Western Hemisphere" },
  { code: "col", name: "Colombia", group: "Western Hemisphere" },
  { code: "cri", name: "Costa Rica", group: "Western Hemisphere" },
  { code: "dom", name: "Dominican Republic", group: "Western Hemisphere" },
  { code: "gtm", name: "Guatemala", group: "Western Hemisphere" },
  { code: "mex", name: "Mexico", group: "Western Hemisphere" },
  { code: "per", name: "Peru", group: "Western Hemisphere" },
  { code: "pry", name: "Paraguay", group: "Western Hemisphere" },
  { code: "ury", name: "Uruguay", group: "Western Hemisphere" },
  { code: "usa", name: "United States", group: "Western Hemisphere", outputCode: "us" }
];

export const countryPresets = {
  US: ["usa"],
  G7: ["usa", "can", "gbr", "jpn"],
  EM_ASIA: ["bgd", "idn", "ind", "mys", "phl", "tha", "vnm"],
  CLEAR: []
};

function getOutputCode(country) {
  return country.outputCode || country.code;
}

export function getCountryFile(country, section) {
  if (section === "economic") return `${country.code}_Data.csv`;
  if (section === "interest") return `rstar_HLW_SV_${getOutputCode(country)}.csv`;
  return "";
}
