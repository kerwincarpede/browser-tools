// One sample per Mermaid diagram type. `github: true` marks the types GitHub's own
// renderer documents/supports; the rest are newer types the bundled Mermaid knows.
export const samples = [
  {
    key: 'flowchart',
    title: 'Flowchart',
    github: true,
    code: `flowchart LR
  A[Start] --> B{Is it?}
  B -->|Yes| C[OK]
  B -- No --> D[Not OK]
  subgraph sub_1 [Sub]
    C --> E((End))
  end
  D --> sub_1
  E --> F[Done]`,
  },
  {
    key: 'sequence',
    title: 'Sequence diagram',
    github: true,
    code: `sequenceDiagram
  autonumber
  actor U as User
  participant W as Web
  participant A as API
  U->>W: Open page
  W->>A: GET /items
  activate A
  A-->>W: 200 OK
  deactivate A
  alt cache hit
    W-->>U: Render cached
  else miss
    W-->>U: Render fresh
  end
  Note over W,A: All calls over HTTPS`,
  },
  {
    key: 'class',
    title: 'Class diagram',
    github: true,
    code: `classDiagram
  class Animal {
    +String name
    +int age
    +makeSound() void
  }
  class Duck {
    +swim()
  }
  class Fish {
    -int sizeInFeet
    -canEat()
  }
  Animal <|-- Duck
  Animal <|-- Fish
  Duck "1" --> "*" Egg : lays`,
  },
  {
    key: 'state',
    title: 'State diagram',
    github: true,
    code: `stateDiagram-v2
  [*] --> Idle
  Idle --> Loading : fetch
  Loading --> Ready : ok
  Loading --> Error : fail
  Error --> Loading : retry
  state Ready {
    [*] --> Viewing
    Viewing --> Editing : edit
    Editing --> Viewing : save
  }
  Ready --> [*]`,
  },
  {
    key: 'er',
    title: 'Entity relationship diagram',
    github: true,
    code: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  PRODUCT ||--o{ LINE_ITEM : "ordered in"
  CUSTOMER {
    string id PK
    string name
    string email
  }
  ORDER {
    string id PK
    string customerId FK
    date placedAt
  }`,
  },
  {
    key: 'journey',
    title: 'User journey',
    github: true,
    code: `journey
  title My working day
  section Go to work
    Make tea: 5: Me
    Go upstairs: 3: Me
    Do work: 1: Me, Cat
  section Go home
    Go downstairs: 5: Me
    Sit down: 5: Me`,
  },
  {
    key: 'gantt',
    title: 'Gantt chart',
    github: true,
    code: `gantt
  title Release plan
  dateFormat YYYY-MM-DD
  section Build
    Design        :done,    des, 2026-11-01, 4d
    Implement     :active,  imp, after des, 6d
    Review        :         rev, after imp, 2d
  section Ship
    Store review  :crit,    sr, after rev, 3d
    Launch        :milestone, after sr, 0d`,
  },
  {
    key: 'pie',
    title: 'Pie chart',
    github: true,
    code: `pie showData
  title Browser share
  "Chrome" : 65
  "Edge" : 13
  "Safari" : 12
  "Firefox" : 7
  "Other" : 3`,
  },
  {
    key: 'quadrant',
    title: 'Quadrant chart',
    github: true,
    code: `quadrantChart
  title Reach and engagement of campaigns
  x-axis Low Reach --> High Reach
  y-axis Low Engagement --> High Engagement
  quadrant-1 We should expand
  quadrant-2 Need to promote
  quadrant-3 Re-evaluate
  quadrant-4 May be improved
  Campaign A: [0.3, 0.6]
  Campaign B: [0.45, 0.23]
  Campaign C: [0.57, 0.69]
  Campaign D: [0.78, 0.34]`,
  },
  {
    key: 'requirement',
    title: 'Requirement diagram',
    github: true,
    code: `requirementDiagram
  requirement test_req {
    id: 1
    text: the test text.
    risk: high
    verifymethod: test
  }
  element test_entity {
    type: simulation
  }
  test_entity - satisfies -> test_req`,
  },
  {
    key: 'git',
    title: 'Git graph',
    github: true,
    code: `gitGraph
  commit
  branch develop
  checkout develop
  commit
  commit
  checkout main
  merge develop
  commit`,
  },
  {
    key: 'c4',
    title: 'C4 context diagram',
    github: true,
    code: `C4Context
  title System context for the shop
  Person(customer, "Customer", "Buys things")
  System(shop, "Shop", "Web storefront")
  System_Ext(pay, "Payments", "Card processor")
  Rel(customer, shop, "Uses")
  Rel(shop, pay, "Charges cards via")`,
  },
  {
    key: 'mindmap',
    title: 'Mindmap',
    github: true,
    code: `mindmap
  root((Mermaid Lens))
    Viewer
      Pan
      Zoom
      Full screen
    Highlight
      Connected
      Full flow
    Export
      PNG
      SVG`,
  },
  {
    key: 'timeline',
    title: 'Timeline',
    github: true,
    code: `timeline
  title History of social media
  2002 : LinkedIn
  2004 : Facebook : Google
  2005 : YouTube
  2006 : Twitter`,
  },
  {
    key: 'sankey',
    title: 'Sankey diagram',
    github: true,
    code: `sankey-beta

Bio-conversion,Liquid,0.597
Bio-conversion,Losses,26.862
Bio-conversion,Solid,280.322
Bio-conversion,Gas,81.144
Solid,Thermal generation,400
Gas,Thermal generation,80`,
  },
  {
    key: 'xychart',
    title: 'XY chart',
    github: true,
    code: `xychart-beta
  title "Sales revenue"
  x-axis [jan, feb, mar, apr, may, jun]
  y-axis "Revenue (in $)" 4000 --> 11000
  bar [5000, 6000, 7500, 8200, 9500, 10500]
  line [5000, 6000, 7500, 8200, 9500, 10500]`,
  },
  {
    key: 'block',
    title: 'Block diagram',
    github: true,
    code: `block-beta
  columns 3
  frontend blockArrowId6<["&nbsp;&nbsp;&nbsp;"]>(right) backend
  space:2 down<["&nbsp;&nbsp;&nbsp;"]>(down)
  disk left<["&nbsp;&nbsp;&nbsp;"]>(left) database[("Database")]
  classDef front fill:#696,stroke:#333;
  class frontend front`,
  },
  {
    key: 'packet',
    title: 'Packet diagram',
    github: true,
    code: `packet-beta
  0-15: "Source Port"
  16-31: "Destination Port"
  32-63: "Sequence Number"
  64-95: "Acknowledgment Number"
  96-99: "Data Offset"
  100-105: "Reserved"
  106-111: "Flags"
  112-127: "Window"`,
  },
  {
    key: 'kanban',
    title: 'Kanban',
    github: true,
    code: `kanban
  todo[Todo]
    t1[Write docs]
    t2[Add samples]
  doing[In progress]
    t3[Probe diagram types]
  done[Done]
    t4[Ship 0.1.0]`,
  },
  {
    key: 'architecture',
    title: 'Architecture diagram',
    github: true,
    code: `architecture-beta
  group api(cloud)[API]
  service db(database)[Database] in api
  service disk1(disk)[Storage] in api
  service server(server)[Server] in api
  db:L -- R:server
  disk1:T -- B:server`,
  },
  {
    key: 'radar',
    title: 'Radar chart',
    github: true,
    code: `radar-beta
  title Skills
  axis a["Design"], b["Code"], c["Test"], d["Docs"], e["Ops"]
  curve x["Alice"]{4, 5, 3, 2, 4}
  curve y["Bob"]{3, 2, 5, 4, 3}
  max 5`,
  },
  {
    key: 'treemap',
    title: 'Treemap',
    github: true,
    code: `treemap-beta
"Products"
    "Electronics"
        "Phones": 50
        "Laptops": 30
    "Clothing"
        "Shirts": 20
        "Shoes": 25`,
  },
  // Newer types (Mermaid 11.10+ / 12) that GitHub may not render yet.
  {
    key: 'venn',
    title: 'Venn diagram',
    code: `venn-beta
  title Overlap
  set A["Frontend"]
  set B["Backend"]
  union A,B["Full stack"]`,
  },
  {
    key: 'ishikawa',
    title: 'Ishikawa (fishbone)',
    code: `ishikawa
  Slow page load
    People
      No perf budget
    Process
      No profiling in CI
    Technology
      Large bundle
      Uncached API`,
  },
  {
    key: 'wardley',
    title: 'Wardley map',
    code: `wardley-beta
  title Tea shop
  anchor Business [0.95, 0.63]
  component Cup of Tea [0.79, 0.61]
  component Tea [0.63, 0.81]
  component Hot Water [0.52, 0.80]
  Business -> Cup of Tea
  Cup of Tea -> Tea
  Cup of Tea -> Hot Water`,
  },
  {
    key: 'treeview',
    title: 'Tree view',
    code: `treeView-beta
  src
    enhancer
      index.ts
      viewer.ts
    detector.ts`,
  },
  {
    key: 'zenuml',
    title: 'ZenUML (needs an external plugin)',
    code: `zenuml
  Alice->Bob: Hello
  Bob->Alice: Hi`,
  },
  {
    key: 'elk',
    title: 'Flowchart with ELK layout',
    code: `---
config:
  layout: elk
---
flowchart TD
  A --> B --> C
  A --> C`,
  },
  {
    key: 'handdrawn',
    title: 'Hand-drawn look + init directive',
    github: true,
    code: `---
title: Hand drawn
config:
  look: handDrawn
---
flowchart LR
  A[Idea] --> B[Sketch] --> C[Ship]`,
  },
];
