/* =====================================================================
   PROJECTS  —  research projects, edit as they start, progress, or finish.
   ---------------------------------------------------------------------
   HOW TO ADD A PROJECT:
   Copy one { ... } block, paste it into the list, edit the fields, and
   keep the commas between blocks.

   HOW TO CHANGE A STATUS (e.g. a project finishes):
   Just change   status: "active"   to   status: "completed".
   The card updates its label, colour, and which filter tab it appears
   under \u2014 nothing else to touch.

   FIELDS:
     title  : the project name
     desc   : a short description (1\u20132 sentences)
     status : "active"  or  "completed"
              (any other word is treated as active. Stick to these two
               so the Active / Completed filter tabs work.)

   Order in this list = order on the page (put featured ones first if
   you like). Save the file and refresh.
   ===================================================================== */

const PROJECTS = [
  {
    title: "Hierarchical IDS for Zero-Day Attack Detection in IoMT",
    desc: "A hierarchical intrusion detection system to detect zero-day attacks in the Internet of Medical Things using advanced machine learning techniques.",
    status: "active"
  },
  {
    title: "Zero-Knowledge Proofs for Pharmaceutical Traceability",
    desc: "A blockchain-supported pharmaceutical traceability and recall platform designed for the Australian Capital Territory (ACT) public health context.",
    status: "active"
  },
  {
    title: "Explainable Hierarchical Model for Lung & Colon Cancer Detection",
    desc: "An explainable hierarchical deep-learning framework that decomposes diagnosis into clinically meaningful stages, emulating the stepwise reasoning of pathologists.",
    status: "active"
  },
  {
    title: "Keystroke Dynamics\u2013Based Authentication",
    desc: "A hybrid machine-learning authentication framework that leverages keystroke dynamics to verify user identity and detect imposters.",
    status: "active"
  },
  {
    title: "Graph-Based Semi-Supervised Detection of Illicit Bitcoin",
    desc: "A framework addressing the labeling challenge while comparing classical ML, ensemble, deep learning, and graph neural network approaches for detecting illicit Bitcoin transactions.",
    status: "active"
  },
  {
    title: "Scalable Hierarchical Intrusion Detection for IoV",
    desc: "Hierarchical classification to detect cyberattacks from network traffic in the Internet of Vehicles, achieving 99.2% accuracy.",
    status: "completed"
  }
];
