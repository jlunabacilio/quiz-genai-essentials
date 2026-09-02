// Quiz content for "Generative AI Essentials" training.
// Each day maps to one module from the source deck.
const QUIZ_DAYS = [
  {
    id: 1,
    title: "Gen AI Foundations",
    subtitle: "AI vs ML vs GenAI vs Agentic AI, LLM basics, market landscape",
    questions: [
      {
        q: "What best describes Artificial Intelligence?",
        options: [
          "The ability for computers to learn from data without explicit programming",
          "The theory and methods to build machines that think and act like humans",
          "Systems that generate new content like text or images",
          "Systems that orchestrate multiple agents autonomously"
        ],
        correct: 1,
        explanation: "AI is the broad theory and methods for building machines that think and act like humans. ML, GenAI, and Agentic AI are more specific paradigms within it."
      },
      {
        q: "Which capability is unique to Agentic AI compared to a single foundation model?",
        options: [
          "Generating text",
          "Understanding language",
          "Orchestrating multiple agents to act autonomously toward a goal",
          "Translating languages"
        ],
        correct: 2,
        explanation: "Agentic AI orchestrates multiple agents and acts autonomously (or semi-autonomously) to achieve goals, going beyond single-model text generation."
      },
      {
        q: "What is a \"token\" in the context of LLMs?",
        options: [
          "A unit of currency used to pay for API calls",
          "The smallest unit of text a model processes",
          "A security credential for accessing the model",
          "A checkpoint saved during model training"
        ],
        correct: 1,
        explanation: "A token is the smallest unit of text a model processes — it can be a character, part of a word, a whole word, or punctuation."
      },
      {
        q: "What does the \"context window\" refer to?",
        options: [
          "The visual interface of the chat app",
          "How much text a model can handle during an interaction",
          "The time period the model was trained on",
          "The number of tokens generated per second"
        ],
        correct: 1,
        explanation: "The context window is how much text (in tokens) a model can handle at once during an interaction."
      },
      {
        q: "What happens when you increase a model's temperature?",
        options: [
          "The model becomes more focused and deterministic",
          "The model becomes more diverse and creative, but less predictable",
          "The model runs faster",
          "The model uses less context window"
        ],
        correct: 1,
        explanation: "Higher temperature increases randomness, making output more diverse and imaginative but less predictable. Lower temperature is focused and deterministic."
      },
      {
        q: "What is a hallucination in GenAI?",
        options: [
          "A creative writing technique",
          "Content generated with total confidence even though it's false or made up",
          "An error message shown by the model",
          "A type of prompt injection attack"
        ],
        correct: 1,
        explanation: "Hallucinations are confidently stated but false or fabricated content — a key risk to watch for."
      },
      {
        q: "Which of these is a real DevOps use case for GenAI mentioned in the training?",
        options: [
          "Manually writing all CI/CD pipelines from scratch",
          "Log summarization and root-cause analysis",
          "Replacing all cloud infrastructure with AI",
          "Eliminating the need for observability tools"
        ],
        correct: 1,
        explanation: "Log summarization, observability, and root-cause analysis are called out as concrete DevOps use cases for GenAI."
      },
      {
        q: "Traditional foundation models are primarily focused on:",
        options: [
          "Taking autonomous actions in the real world",
          "Language understanding and generation",
          "Orchestrating other AI agents",
          "Executing tool calls automatically"
        ],
        correct: 1,
        explanation: "Foundation models are large-scale, general-purpose models primarily focused on language understanding and generation — they don't act by themselves or pursue goals."
      }
    ]
  },
  {
    id: 2,
    title: "Prompting",
    subtitle: "Prompt anatomy, elements, zero-shot, few-shot, role, chain-of-thought",
    questions: [
      {
        q: "In the \"anatomy of a good prompt,\" what does \"Role\" refer to?",
        options: [
          "The output format you want",
          "The persona or role the AI should assume",
          "Background information for context",
          "Example outputs to imitate"
        ],
        correct: 1,
        explanation: "Role defines the persona the AI should assume, e.g. \"You are a content marketing writer.\""
      },
      {
        q: "Which prompt element specifies the type or format of the answer?",
        options: [
          "Instruction",
          "Input Data",
          "Output indicator",
          "Context"
        ],
        correct: 2,
        explanation: "The output indicator tells the model the type or format of the expected output, like \"Sentiment:\" in a classification prompt."
      },
      {
        q: "What's the main tradeoff of zero-shot prompting?",
        options: [
          "Slow but very precise",
          "Fast but less precise",
          "Requires many examples",
          "Only works for coding tasks"
        ],
        correct: 1,
        explanation: "Zero-shot means asking directly with no examples — it's fast but tends to be less precise than few-shot for complex tasks."
      },
      {
        q: "When should you use few-shot prompting?",
        options: [
          "When you need format/style to matter and have complex tasks",
          "When you want the fastest possible response",
          "When no examples are available",
          "Only for simple exploration"
        ],
        correct: 0,
        explanation: "Few-shot provides 2-3 examples and gives much better results for complex tasks, especially when format or style matters."
      },
      {
        q: "What is Chain-of-Thought (CoT) prompting best suited for?",
        options: [
          "Quick factual lookups",
          "Debugging, root-cause analysis, multi-step logic",
          "Formatting text as JSON",
          "Setting a persona for the AI"
        ],
        correct: 1,
        explanation: "CoT asks the model to reason step-by-step, which is best for debugging, root-cause analysis, and multi-step logic."
      },
      {
        q: "\"Act as a senior dev...\" is an example of which prompting technique?",
        options: [
          "Zero-shot",
          "Few-shot",
          "Role prompting",
          "Chain-of-thought"
        ],
        correct: 2,
        explanation: "Assigning a persona like \"Act as a senior dev\" is role prompting."
      },
      {
        q: "According to the training, which technique fits best when \"format/style matters\"?",
        options: [
          "Zero-shot",
          "Few-shot",
          "Role",
          "Chain-of-thought"
        ],
        correct: 1,
        explanation: "Few-shot is recommended when format or style matters, since examples show the model exactly what you want."
      },
      {
        q: "In \"Classify the text into neutral, negative, or positive. Text: I think the food was okay. Sentiment:\" — what does \"Text: I think the food was okay.\" represent?",
        options: [
          "Instruction",
          "Output indicator",
          "Input Data",
          "Context"
        ],
        correct: 2,
        explanation: "\"Text: I think the food was okay.\" is the Input Data — the content the model needs to act on."
      }
    ]
  },
  {
    id: 3,
    title: "Agents, MCP & Context",
    subtitle: "Agent vs chatbot, the ReAct loop, MCP, grounding & RAG",
    questions: [
      {
        q: "What's a key difference between a chatbot and an agent?",
        options: [
          "Chatbots can call tools; agents can't",
          "Agents plan, act, observe, and adjust; chatbots respond",
          "Chatbots maintain state across steps; agents don't",
          "Agents are limited to Q&A interactions"
        ],
        correct: 1,
        explanation: "Chatbots mainly respond to Q&A; agents plan, act, observe, and adjust to pursue a goal, and can call tools and maintain state."
      },
      {
        q: "What are the three steps of the ReAct agent loop?",
        options: [
          "Plan → Act → Observe",
          "Think → Generate → Output",
          "Input → Process → Output",
          "Query → Retrieve → Respond"
        ],
        correct: 0,
        explanation: "ReAct stands for Reasoning + Acting, cycling through Plan → Act → Observe."
      },
      {
        q: "What problem does MCP (Model Context Protocol) primarily solve?",
        options: [
          "It makes models generate faster responses",
          "It's an open standard for connecting AI applications to external systems like data sources and tools",
          "It compresses context windows automatically",
          "It replaces the need for prompts"
        ],
        correct: 1,
        explanation: "MCP is an open-source standard that lets AI applications connect to data sources, tools, and workflows."
      },
      {
        q: "Why does MCP matter to developers, according to the training?",
        options: [
          "It eliminates the need for testing",
          "It reduces development time and complexity when building or integrating AI applications",
          "It guarantees zero hallucinations",
          "It removes the need for APIs"
        ],
        correct: 1,
        explanation: "For developers, MCP reduces development time and complexity when building or integrating with an AI application or agent."
      },
      {
        q: "What does \"grounding\" mean in the context of GenAI?",
        options: [
          "Restarting a model after a crash",
          "Connecting the AI's output to verifiable sources of information",
          "Limiting the temperature to zero",
          "Reducing the size of the context window"
        ],
        correct: 1,
        explanation: "Grounding connects the AI's output to verifiable sources of information, reducing the risk of hallucination."
      },
      {
        q: "What does RAG stand for and do?",
        options: [
          "Rapid AI Generation — speeds up responses",
          "Retrieval-Augmented Generation — retrieves data to ground the model's output",
          "Recursive Agent Guidance — manages agent loops",
          "Response Accuracy Grading — scores model outputs"
        ],
        correct: 1,
        explanation: "RAG is Retrieval-Augmented Generation — retrieving relevant data from a source to ground the model's response."
      },
      {
        q: "In the RAG flow, what typically happens right after a Query is issued?",
        options: [
          "The Model generates output immediately",
          "The Database is searched for relevant information",
          "The Prompt is discarded",
          "A new agent is spawned"
        ],
        correct: 1,
        explanation: "The flow is Query → Database → Prompt → Model → Output: the database is searched before the model generates a response."
      },
      {
        q: "What does \"memory\" enable in an AI system, per the training?",
        options: [
          "Faster token processing",
          "Storing and recalling past experiences to improve decision-making and performance",
          "Reducing model size",
          "Preventing prompt injection"
        ],
        correct: 1,
        explanation: "Memory is the AI system's ability to store and recall past experiences to improve decision-making, perception, and overall performance."
      }
    ]
  },
  {
    id: 4,
    title: "Skills & Agent Harness",
    subtitle: "Reusable skills, skills in practice, the agent harness",
    questions: [
      {
        q: "What is a \"Skill,\" as defined in the training?",
        options: [
          "A one-time prompt that can't be reused",
          "A reusable capability that lets an agent do specialized work the same way, every time",
          "A security permission granted to an agent",
          "A type of foundation model"
        ],
        correct: 1,
        explanation: "Skills are reusable capabilities that let an agent do specialized work consistently, every time."
      },
      {
        q: "Which of these is a benefit of Skills mentioned in the training?",
        options: [
          "They reduce the model's context window",
          "They capture what your organization knows and let you build once, use everywhere",
          "They eliminate the need for human review",
          "They only work with one specific model"
        ],
        correct: 1,
        explanation: "Skills capture organizational knowledge, deliver consistent results, and let you build once and use everywhere."
      },
      {
        q: "In the \"CI/CD pipeline review\" skill example, what's part of the mandatory checklist?",
        options: [
          "Build, test, deploy to dev",
          "Only deploy to production",
          "Manual code review by a senior engineer",
          "Randomized naming for stages"
        ],
        correct: 0,
        explanation: "The example skill lists a mandatory stages checklist: build, test, deploy to dev."
      },
      {
        q: "What naming convention is recommended for Infrastructure as Code resources?",
        options: [
          "resource-project-environment",
          "project-environment-resource",
          "environment-only naming",
          "No naming convention needed"
        ],
        correct: 1,
        explanation: "The IaC standards skill recommends project-environment-resource naming."
      },
      {
        q: "What security policy is called out for IaC standards?",
        options: [
          "All security groups must allow 0.0.0.0/0",
          "No security groups open to 0.0.0.0/0",
          "Security groups are optional",
          "Only IPv6 traffic is allowed"
        ],
        correct: 1,
        explanation: "The IaC skill explicitly forbids security groups open to 0.0.0.0/0."
      },
      {
        q: "What is the \"Agent Harness\"?",
        options: [
          "A type of prompt template",
          "The software environment around an AI model that lets it use tools, remember interactions, and run multi-step tasks",
          "A security scanner for prompts",
          "A benchmark for comparing models"
        ],
        correct: 1,
        explanation: "The agent harness is the software environment around a model — tools, memory, and multi-step task execution."
      },
      {
        q: "Which of these is listed as part of the Agent Harness?",
        options: [
          "Bundled infrastructure like filesystem, sandbox, and browser",
          "Only the system prompt",
          "A single fixed tool",
          "Manual approval workflows only"
        ],
        correct: 0,
        explanation: "The harness includes system prompts, tools/skills/MCPs, bundled infrastructure (filesystem, sandbox, browser), and orchestration logic."
      },
      {
        q: "What does \"orchestration logic\" in the Agent Harness cover?",
        options: [
          "Formatting output as JSON",
          "Subagent spawning, handoffs, and model routing",
          "Token counting",
          "Setting the temperature parameter"
        ],
        correct: 1,
        explanation: "Orchestration logic covers subagent spawning, handoffs between agents, and model routing."
      }
    ]
  },
  {
    id: 5,
    title: "Security & Guardrails",
    subtitle: "Prompt injection, mitigations, Responsible AI, SAIF, model limitations",
    questions: [
      {
        q: "Why is prompt injection possible, according to the training?",
        options: [
          "Models are too slow to detect attacks",
          "The model can't tell instructions from data — it's all one context window",
          "Models don't have a context window",
          "Prompts are always encrypted"
        ],
        correct: 1,
        explanation: "The model can't distinguish instructions from data; it's all one context window, which attackers can exploit."
      },
      {
        q: "Which of these is a recommended mitigation for prompt injection?",
        options: [
          "Append raw user input directly to system instructions",
          "Apply least privilege to the permissions and tools granted to AI agents",
          "Give agents full, unrestricted tool access",
          "Remove all human review from the process"
        ],
        correct: 1,
        explanation: "Applying least privilege — limiting the permissions and tools granted to agents — is a key mitigation."
      },
      {
        q: "What does \"keeping a human in the loop\" mitigate, per the security section?",
        options: [
          "Slow response times",
          "High-risk or irreversible actions happening without approval",
          "High token costs",
          "Model hallucinations only"
        ],
        correct: 1,
        explanation: "A human in the loop provides manual approval before high-risk or irreversible actions like financial transactions or infrastructure changes."
      },
      {
        q: "How many dimensions does the training list for Responsible AI?",
        options: ["5", "8", "10", "12"],
        correct: 2,
        explanation: "The training lists ten dimensions: Controllability, Privacy, Security, Safety, Veracity, Robustness, Fairness, Explainability, Transparency, and Governance."
      },
      {
        q: "Which of these IS one of the ten Responsible AI dimensions mentioned?",
        options: ["Profitability", "Explainability", "Scalability", "Popularity"],
        correct: 1,
        explanation: "Explainability is one of the ten Responsible AI dimensions."
      },
      {
        q: "What does SAIF stand for and help with?",
        options: [
          "Secure AI Framework — helps manage AI/ML model risks and ensure security",
          "Standard AI Interface Format — defines prompt formatting",
          "Safe Agent Interaction Flow — controls agent conversations",
          "System AI Integrity Filter — blocks malicious code"
        ],
        correct: 0,
        explanation: "SAIF (Secure AI Framework) helps organizations manage AI/ML model risks and ensure security."
      },
      {
        q: "What is a \"knowledge cutoff\" limitation of foundation models?",
        options: [
          "The model has a maximum number of users",
          "Models are trained up to a specific date and may lack info after it",
          "The model can only answer 100 questions per day",
          "The model can't process images"
        ],
        correct: 1,
        explanation: "Models are trained up to a specific date, so they may lack information about anything after that cutoff."
      },
      {
        q: "Why should you verify hallucinated content before acting on it?",
        options: [
          "Hallucinations are always obviously wrong",
          "Models can state fabricated information with complete confidence",
          "Hallucinations only happen with low temperature",
          "Hallucinations are a rare, easily detected edge case"
        ],
        correct: 1,
        explanation: "Models can state fabricated information with total confidence, so verification before acting is essential."
      }
    ]
  },
  {
    id: 6,
    title: "Human in the Loop",
    subtitle: "HITL, review stages, benefits, and when not to use AI",
    questions: [
      {
        q: "What is Human in the Loop (HITL)?",
        options: [
          "A process where human input and feedback are directly integrated into AI workflows",
          "A fully automated pipeline with no human review",
          "A technique for reducing token usage",
          "A type of prompt injection defense only"
        ],
        correct: 0,
        explanation: "HITL integrates human input and feedback directly into AI workflows."
      },
      {
        q: "What happens during \"pre-generation review\"?",
        options: [
          "Users rate the AI after deployment",
          "Human experts review and validate AI outputs before deployment",
          "The model is retrained automatically",
          "Nothing — it's a fully automated step"
        ],
        correct: 1,
        explanation: "Pre-generation review has human experts validate AI outputs before deployment, catching errors or biases early."
      },
      {
        q: "What is a benefit of post-generation review?",
        options: [
          "It removes the need for any monitoring",
          "Continuous feedback after deployment helps models improve and adapt",
          "It eliminates hallucinations completely",
          "It replaces pre-generation review entirely"
        ],
        correct: 1,
        explanation: "Continuous human review and feedback after deployment help models improve and adapt to changing contexts and user needs."
      },
      {
        q: "Which of these is listed as a benefit of human oversight?",
        options: [
          "Reduced transparency",
          "Bias mitigation",
          "Increased hallucination rate",
          "Slower adaptation over time"
        ],
        correct: 1,
        explanation: "Bias mitigation is one of the listed benefits, alongside accuracy, transparency, trust, and continuous adaptation."
      },
      {
        q: "According to \"When not to use AI,\" which question should make you keep a human in the loop if the answer is yes?",
        options: [
          "Is the task boring?",
          "Are there legal, compliance, or security consequences if it's wrong?",
          "Does the task take more than 5 minutes?",
          "Is the output longer than one paragraph?"
        ],
        correct: 1,
        explanation: "If there are legal, compliance, or security consequences of being wrong, keep a human in the loop."
      },
      {
        q: "What's the core message of \"Automate tasks, not trust\"?",
        options: [
          "Never use AI for any task",
          "You can automate execution, but human judgment and accountability still matter",
          "Trust should always be automated",
          "AI should make all final decisions"
        ],
        correct: 1,
        explanation: "Automating a task doesn't mean automating trust — human judgment and accountability still matter."
      },
      {
        q: "If output can't be verified, what should you do per the training?",
        options: [
          "Deploy it anyway since verification isn't necessary",
          "Keep a human in the loop",
          "Increase the temperature setting",
          "Switch to a different foundation model"
        ],
        correct: 1,
        explanation: "Being unable to verify the output is one of the signals to keep a human in the loop."
      },
      {
        q: "Which scenario best signals you should keep a human in the loop?",
        options: [
          "Data involved shouldn't leave your organization's boundary",
          "The task is repetitive and low-risk",
          "The output format is plain text",
          "The model has a large context window"
        ],
        correct: 0,
        explanation: "If the task involves data that shouldn't leave your organization's boundary, keep a human in the loop."
      }
    ]
  }
];
