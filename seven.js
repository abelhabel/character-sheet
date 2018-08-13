var tpl = {
  name: "Seven",
  categories: [
    {
      name: "Faculties of the body",
      pool: "bodyFaculties",
      items: [
        {
          name: "Strength",
          type: "increment",
          description: "Increased attack damage and strength checks.",
          range: [0, 10]
        },
        {
          name: "Endurance",
          type: "increment",
          description: "Increases health and endurance checks",
          range: [0, 10]
        },
        {
          name: "Agility",
          type: "increment",
          description: "Increases evasion and agility checks",
          range: [0, 10]
        }
      ]
    },
    {
      name: "Faculties of the mind",
      pool: "mindFaculties",
      items: [
        {
          name: "Intuition",
          type: "increment",
          description: "Increased experience for skill levels 1-3 and intuition checks.",
          range: [0, 10]
        },
        {
          name: "Intelligence",
          type: "increment",
          description: "Increased experience for skill levels 4-7 and intelligence checks",
          range: [0, 10]
        },
        {
          name: "Instinct",
          type: "increment",
          description: "Increased experience for skill levels 8-10 and instinct checks",
          range: [0, 10]
        }
      ]
    }
  ]
};

module.exports = tpl;
