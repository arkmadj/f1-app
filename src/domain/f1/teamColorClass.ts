const teamColorClass = {
  Mercedes: "text-(--mcs1)",
  "Red Bull": "text-(--rb1)",
  Ferrari: "text-(--fr1)",
  "Aston Martin": "text-(--am1)",
  "Alpine F1 Team": "text-(--a4)",
  "RB F1 Team": "text-(--rbca1)",
  Sauber: "text-(--k1)",
  McLaren: "text-(--mc1)",
  "Haas F1 Team": "text-(--haas4)",
  Williams: "text-(--w1)",
} as const satisfies Record<string, string>;

export default teamColorClass;
