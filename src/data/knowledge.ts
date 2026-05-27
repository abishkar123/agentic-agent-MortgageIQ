export interface KnowledgeEntry {
  id: string
  category: 'product' | 'eligibility' | 'process' | 'faq' | 'glossary'
  title: string
  content: string
  keywords: string[]
}

export const knowledgeBase: KnowledgeEntry[] = [
  // Products
  {
    id: 'variable-rate',
    category: 'product',
    title: 'Variable Rate Home Loan',
    content:
      'A variable rate home loan has an interest rate that can change over time in line with the official cash rate set by the Reserve Bank of Australia (RBA). When rates go down, your repayments decrease; when rates rise, repayments increase. Variable loans offer more flexibility: offset accounts, redraw facilities, and extra repayments without penalty. They suit borrowers who want flexibility and can absorb rate movements.',
    keywords: [
      'variable', 'variable rate', 'home loan', 'flexible', 'rba', 'cash rate', 'interest', 'repayment', 'rate change',
    ],
  },
  {
    id: 'fixed-rate',
    category: 'product',
    title: 'Fixed Rate Home Loan',
    content:
      "A fixed rate home loan locks your interest rate for a set period, typically 1 to 5 years. This gives certainty about repayments during the fixed term regardless of RBA rate changes. Fixed loans may restrict extra repayments (often capped at $10,000/year) and usually don't include offset accounts. At the end of the fixed term, the loan reverts to the lender's variable rate. Fixed rates suit borrowers who want repayment certainty.",
    keywords: [
      'fixed', 'fixed rate', 'lock', 'certainty', 'stability', 'term', 'revert', 'no change', 'budget',
    ],
  },
  {
    id: 'split-loan',
    category: 'product',
    title: 'Split Home Loan',
    content:
      'A split loan divides your mortgage into two portions: one fixed and one variable. For example, you might fix 60% for rate certainty and keep 40% variable for flexibility. The fixed portion gives repayment stability; the variable portion allows extra repayments, redraw, and an offset account. Split loans let you hedge against rate movements while still enjoying some flexibility.',
    keywords: [
      'split', 'split loan', 'combination', 'fixed and variable', 'hybrid', 'portion', 'part fixed', 'part variable',
    ],
  },
  {
    id: 'offset-account',
    category: 'product',
    title: 'Offset Account',
    content:
      "An offset account is a transaction account linked to your home loan. The balance in your offset account is offset against your outstanding loan balance before interest is calculated. For example, with a $500,000 loan and $50,000 in offset, you pay interest on only $450,000. Offset accounts reduce your interest costs and can shorten your loan term significantly. They're available on most variable rate loans.",
    keywords: [
      'offset', 'offset account', 'transaction account', 'savings', 'reduce interest', 'linked account', 'interest saving',
    ],
  },
  {
    id: 'redraw',
    category: 'product',
    title: 'Redraw Facility',
    content:
      "A redraw facility lets you access extra repayments you've made on your home loan. If you've paid $20,000 above the minimum, you may redraw that money for major expenses. Redraw differs from an offset account — access is not guaranteed, the lender may apply conditions or fees, and funds aren't instantly available. Redraw is available on most variable rate loans but generally not fixed rate loans.",
    keywords: [
      'redraw', 'extra repayment', 'withdraw', 'redraw facility', 'access funds', 'overpayment', 'additional repayment',
    ],
  },
  {
    id: 'construction-loan',
    category: 'product',
    title: 'Construction Loan',
    content:
      "A construction loan is designed for building a new home or undertaking major renovations. Funds are released in stages (progress draws) as construction milestones are met. During construction you pay interest only on the amount drawn down. Once construction is complete, the loan converts to a standard principal and interest loan. Lenders require council-approved plans and a fixed-price building contract.",
    keywords: [
      'construction', 'build', 'building loan', 'new home', 'renovate', 'drawdown', 'progress draw', 'stages', 'builder',
    ],
  },
  {
    id: 'investment-loan',
    category: 'product',
    title: 'Investment Home Loan',
    content:
      "An investment loan is used to purchase a property you plan to rent out rather than live in. Investment rates are generally slightly higher than owner-occupier rates. Loan interest may be tax deductible — consult a tax professional. Interest-only terms are common for investors to maximise cash flow. Lenders assess rental income (typically at 70–80% of gross rent) when calculating your borrowing capacity.",
    keywords: [
      'investment', 'investor', 'rental', 'rent out', 'investment property', 'interest only', 'tax deductible', 'cash flow',
    ],
  },
  {
    id: 'first-home-buyer',
    category: 'product',
    title: 'First Home Buyer Loans',
    content:
      "First home buyers may be eligible for the First Home Guarantee (FHG) scheme, which allows purchasing with a 5% deposit without paying LMI, with the government guaranteeing up to 15%. The First Home Owner Grant (FHOG) provides a one-off payment for building or buying a new home; amounts vary by state. Stamp duty concessions are available in most states. Eligibility has income caps and property price limits. Ask a broker about which schemes apply to you.",
    keywords: [
      'first home', 'first home buyer', 'fhog', 'first home guarantee', 'fhg', 'grant', 'stamp duty concession', '5% deposit', 'first time buyer',
    ],
  },
  {
    id: 'refinance',
    category: 'product',
    title: 'Refinancing Your Home Loan',
    content:
      "Refinancing means replacing your existing home loan with a new one, typically to get a lower interest rate, access equity, or improve loan features. Benefits include lower repayments, debt consolidation, or accessing funds for renovations. Costs include discharge fees on your old loan ($150–$400), establishment fees on the new loan, and potentially LMI if your LVR has risen above 80%. A refinancing break-even analysis compares interest savings to upfront costs.",
    keywords: [
      'refinance', 'refinancing', 'switch', 'better rate', 'access equity', 'consolidate', 'existing loan', 'new lender', 'break-even',
    ],
  },
  {
    id: 'interest-only',
    category: 'product',
    title: 'Interest-Only Loans',
    content:
      "With an interest-only loan, you pay only the interest portion of your repayment for a set period (typically 1–5 years). Your loan balance does not reduce during this time. After the interest-only period ends, repayments increase as you begin repaying principal over the remaining term. Interest-only loans are common for investors managing cash flow and for borrowers in the early years of ownership.",
    keywords: [
      'interest only', 'interest-only', 'io period', 'no principal', 'repayment period', 'lower repayment',
    ],
  },
  {
    id: 'bridging-loan',
    category: 'product',
    title: 'Bridging Loan',
    content:
      "A bridging loan provides short-term finance to cover the gap between buying a new property and selling your existing one. It lets you buy without waiting for your current property to settle. Bridging loans typically run 6–12 months and charge interest on the peak debt (both properties). They are interest-only during the bridging period. Once your existing property sells, the bridging loan is repaid and the remainder converts to a standard home loan.",
    keywords: [
      'bridging', 'bridging loan', 'buy and sell', 'simultaneous', 'peak debt', 'short term', 'sell existing',
    ],
  },

  // Eligibility
  {
    id: 'deposit-requirements',
    category: 'eligibility',
    title: 'Deposit Requirements',
    content:
      "Most lenders require a minimum 20% deposit to avoid Lender's Mortgage Insurance (LMI). Some lenders accept as little as 5% deposit but you'll pay LMI unless you qualify for a government guarantee scheme. A larger deposit means a lower LVR, better interest rates, and reduced costs. Genuine savings (held for at least 3 months) are preferred. Gifted deposits may be accepted with conditions. Equity in another property can substitute for a cash deposit.",
    keywords: [
      'deposit', 'savings', 'down payment', '20% deposit', '5% deposit', 'genuine savings', 'how much deposit', 'minimum deposit',
    ],
  },
  {
    id: 'income-serviceability',
    category: 'eligibility',
    title: 'Income and Serviceability',
    content:
      "Lenders assess your ability to repay the loan (serviceability) using your income minus expenses and existing debts. A 3% buffer above the loan rate is applied to test affordability if rates rise. Lenders accept PAYG salary (100%), self-employment income (2 years of tax returns), rental income (70–80% of gross), bonuses, overtime, and government benefits (conditions apply). Credit card limits, personal loans, and HECS/HELP debt all reduce borrowing capacity — even if balances are zero.",
    keywords: [
      'income', 'serviceability', 'salary', 'can i afford', 'repayment capacity', 'buffer rate', 'how much can i borrow', 'expenses', 'payg',
    ],
  },
  {
    id: 'credit-score',
    category: 'eligibility',
    title: 'Credit Score and Credit History',
    content:
      "Lenders check your credit file for defaults, missed payments, bankruptcies, and recent credit enquiries. A strong credit score (700+ with Equifax) improves approval chances and may get you better rates. Defaults — paid or unpaid — can make approval difficult. Bankruptcies within the last 2 years typically prevent approval with mainstream lenders. Multiple recent credit enquiries in a short period can also lower your score.",
    keywords: [
      'credit', 'credit score', 'credit history', 'default', 'bad credit', 'credit file', 'equifax', 'bankruptcy', 'credit enquiry',
    ],
  },
  {
    id: 'self-employed',
    category: 'eligibility',
    title: 'Self-Employed Borrowers',
    content:
      "Self-employed borrowers typically need 2 years of personal and business tax returns plus ATO Notices of Assessment. Lenders average the last 2 years of income. Some lenders offer 'low doc' loans accepting alternative evidence like an accountant's declaration or BAS statements — but rates are higher. ABN registration for at least 2 years is generally required. Recent significant income fluctuations should be explained to the lender.",
    keywords: [
      'self employed', 'self-employed', 'business owner', 'sole trader', 'abn', 'tax return', 'low doc', 'bas statement', 'accountant',
    ],
  },
  {
    id: 'guarantor-loans',
    category: 'eligibility',
    title: 'Guarantor Loans',
    content:
      "A guarantor (typically a parent) uses equity in their own property as additional security for your loan, allowing you to borrow with a smaller deposit and avoid LMI. The guarantor is legally responsible if you cannot make repayments. Family guarantee structures typically cover 20% of the purchase price, meaning you only need a 5% cash deposit. Once you've built sufficient equity (usually 80% LVR), the guarantee can be removed.",
    keywords: [
      'guarantor', 'family guarantee', 'parents help', 'guarantee', 'small deposit', 'no lmi with guarantor', 'equity',
    ],
  },

  // Glossary / Key Concepts
  {
    id: 'lvr',
    category: 'glossary',
    title: 'Loan to Value Ratio (LVR)',
    content:
      'LVR is the loan amount as a percentage of the property value. Formula: LVR = (Loan Amount ÷ Property Value) × 100. For example, borrowing $400,000 on an $800,000 property gives an LVR of 50%. Borrowing $640,000 on the same property gives an 80% LVR. Lenders prefer LVR at or below 80%. Above 80% LVR, LMI is usually required. Above 95% LVR, most lenders will not lend. A lower LVR signals less risk and may attract a lower interest rate.',
    keywords: [
      'lvr', 'loan to value', 'loan value ratio', 'property value ratio', 'equity percentage', 'how to calculate lvr',
    ],
  },
  {
    id: 'lmi',
    category: 'glossary',
    title: "Lender's Mortgage Insurance (LMI)",
    content:
      "LMI protects the lender (not you) if you default on your loan. It is required when your LVR exceeds 80%. The premium is a one-off cost typically added to your loan balance (capitalised). LMI cost varies: on a $500,000 loan at 90% LVR, expect $8,000–$15,000; at 85% LVR it reduces significantly. Certain professionals (doctors, lawyers, accountants, mining engineers) may be exempt from LMI at higher LVRs with eligible lenders.",
    keywords: [
      'lmi', "lender's mortgage insurance", 'mortgage insurance', 'lmi premium', 'above 80%', 'lmi cost',
    ],
  },
  {
    id: 'comparison-rate',
    category: 'glossary',
    title: 'Comparison Rate',
    content:
      'A comparison rate combines the interest rate with most standard fees into a single percentage for easy loan comparison. It is standardised on a $150,000 loan over 25 years. A loan with a low advertised rate but high fees will show a higher comparison rate. Always compare both the advertised rate (what you pay daily) and the comparison rate (total cost guide). Note: comparison rates exclude government fees and some optional charges.',
    keywords: [
      'comparison rate', 'true rate', 'advertised rate', 'fees included', 'compare loans', 'total cost',
    ],
  },
  {
    id: 'principal-interest',
    category: 'glossary',
    title: 'Principal and Interest (P&I)',
    content:
      "With a principal and interest (P&I) loan, each repayment reduces both the interest charges and the principal (original amount borrowed). Your loan balance decreases with every repayment and the loan is fully paid off at the end of the term. P&I rates are lower than interest-only rates because the lender recovers the debt faster. Most owner-occupiers use P&I repayments. Switching from interest-only to P&I increases monthly repayments.",
    keywords: [
      'principal and interest', 'p&i', 'pi loan', 'reduce balance', 'pay off', 'amortise', 'fully repaid',
    ],
  },
  {
    id: 'equity',
    category: 'glossary',
    title: 'Home Equity',
    content:
      "Home equity is the difference between your property's current market value and what you still owe on your mortgage. For example, a $700,000 property with a $400,000 outstanding loan has $300,000 equity. Usable equity is typically limited to 80% of the property value minus the loan balance. Equity grows as you repay the loan and as property values increase. You can access equity via refinancing to fund renovations, investments, or other purchases.",
    keywords: [
      'equity', 'home equity', 'usable equity', 'property equity', 'access equity', 'equity release', 'how much equity',
    ],
  },

  // Process
  {
    id: 'pre-approval',
    category: 'process',
    title: 'Pre-Approval (Conditional Approval)',
    content:
      "Pre-approval is written confirmation that a lender is likely to approve your loan up to a specific amount, subject to satisfactory valuation and final checks. It gives you confidence when bidding at auction or making offers. Pre-approval typically takes 1–5 business days and is valid for 3–6 months. It is not a guarantee of final approval — income, employment, and property must all be confirmed. A broker can arrange pre-approval before you start searching.",
    keywords: [
      'pre-approval', 'pre approval', 'approval in principle', 'conditional approval', 'how much can i borrow', 'pre-approved',
    ],
  },
  {
    id: 'application-process',
    category: 'process',
    title: 'Home Loan Application Process',
    content:
      'Step 1: Get pre-approval (1–5 days). Step 2: Find a property and make an offer. Step 3: Submit full loan application with documents (ID, payslips, 3 months bank statements, last 2 years tax returns for self-employed). Step 4: Lender orders a property valuation. Step 5: Formal (unconditional) approval issued in 3–15 business days. Step 6: Sign and return loan documents. Step 7: Settlement — lender pays the vendor and you get the keys. Total time from application to settlement is typically 4–8 weeks.',
    keywords: [
      'application', 'apply', 'how to apply', 'loan process', 'steps', 'settlement', 'valuation', 'documents needed', 'how long',
    ],
  },
  {
    id: 'settlement',
    category: 'process',
    title: 'Settlement',
    content:
      "Settlement is the day your purchase is completed. The lender sends funds to the vendor's solicitor/conveyancer, title transfers to your name, and you receive the keys. Building insurance must be in place from settlement date. For refinancing, settlement involves your new lender paying out the old lender. Residential settlements in most states take 4–6 weeks after exchanging contracts, but timeframes can be negotiated.",
    keywords: [
      'settlement', 'completion', 'keys', 'settlement date', 'conveyancer', 'solicitor', 'title transfer',
    ],
  },

  // FAQs
  {
    id: 'how-much-borrow',
    category: 'faq',
    title: 'How Much Can I Borrow?',
    content:
      "Borrowing capacity depends on your income, expenses, existing debts, deposit size, and the lender's serviceability criteria. As a rough guide, lenders typically allow 4–6 times your gross annual income. Major factors reducing capacity: credit card limits (even if unused, usually assessed at 3.8% of limit), personal loans, HECS/HELP debt, car loans, living expenses, and dependants. A broker can calculate your exact borrowing capacity with a serviceability assessment.",
    keywords: [
      'how much can i borrow', 'borrowing capacity', 'maximum loan', 'afford', 'borrow amount', 'how much do i qualify for',
    ],
  },
  {
    id: 'interest-rate-info',
    category: 'faq',
    title: 'Understanding Interest Rates',
    content:
      "Home loan rates in Australia are influenced by the RBA cash rate, the lender's funding costs, and market competition. Variable rates move with RBA decisions (typically 8 per year). Fixed rates reflect market expectations of future rate movements. Advertised rates are the base rate; comparison rates include fees. For the most accurate current rate for your situation, contact a Mortgage House broker on 133 144 or visit mortgagehouse.com.au.",
    keywords: [
      'interest rate', 'current rate', 'rate today', 'best rate', 'lowest rate', 'rba rate', 'rate change', 'how rates work',
    ],
  },
  {
    id: 'stamp-duty',
    category: 'faq',
    title: 'Stamp Duty',
    content:
      "Stamp duty (transfer duty) is a state government tax charged on property purchases. Rates vary by state, territory, and purchase price. First home buyers receive stamp duty concessions or exemptions in most states (conditions apply). Stamp duty must be paid at or around settlement — it cannot be added to your loan (though some lenders offer stamp duty assistance in specific cases). Budget approximately 3–5% of the purchase price for stamp duty plus other upfront costs.",
    keywords: [
      'stamp duty', 'transfer duty', 'state tax', 'government tax', 'upfront costs', 'purchase costs', 'stamp duty exemption',
    ],
  },
  {
    id: 'extra-repayments',
    category: 'faq',
    title: 'Making Extra Repayments',
    content:
      "Making extra repayments on a variable rate loan reduces your principal faster, cutting total interest paid and shortening the loan term. For example, paying an extra $500/month on a $500,000 loan at 6% over 30 years can save over $100,000 in interest and cut more than 6 years off the term. Fixed rate loans usually restrict extra repayments to $10,000 per year. An offset account achieves similar savings without formally reducing the principal.",
    keywords: [
      'extra repayment', 'additional repayment', 'pay off faster', 'save interest', 'lump sum payment', 'overpay',
    ],
  },
  {
    id: 'buying-costs',
    category: 'faq',
    title: 'Upfront Buying Costs',
    content:
      "Beyond your deposit, budget for: stamp duty (largest cost, varies by state), legal/conveyancing fees ($1,000–$2,500), building and pest inspection ($400–$800), loan establishment fees (varies by lender, often waived), LMI if LVR > 80%, and home insurance from settlement. Total upfront costs beyond the deposit are typically 3–5% of the purchase price. First home buyers should check which stamp duty concessions apply in their state.",
    keywords: [
      'buying costs', 'upfront costs', 'extra costs', 'fees', 'conveyancing', 'pest inspection', 'legal fees', 'how much do i need',
    ],
  },
  {
    id: 'mortgage-broker',
    category: 'faq',
    title: 'What Does a Mortgage Broker Do?',
    content:
      "A mortgage broker compares home loans from a panel of lenders and helps you find one that suits your situation. Brokers handle the application paperwork, liaise with lenders, and guide you through settlement. Their service is typically free to you — they are paid a commission by the lender. Brokers have access to more loan products than going directly to a single bank. Mortgage House brokers can be contacted on 133 144 or via mortgagehouse.com.au.",
    keywords: [
      'broker', 'mortgage broker', 'what does a broker do', 'broker fee', 'broker commission', 'use a broker', 'compare loans',
    ],
  },
  {
    id: 'repayment-frequency',
    category: 'faq',
    title: 'Repayment Frequency',
    content:
      "Most home loans offer weekly, fortnightly, or monthly repayments. Paying fortnightly (26 payments per year) instead of monthly (12 payments) effectively makes one extra monthly payment per year, reducing interest and shortening the loan term. For example, on a $500,000 loan at 6% over 30 years, fortnightly repayments instead of monthly can save approximately $50,000 in interest and cut 4+ years off the term.",
    keywords: [
      'repayment frequency', 'weekly', 'fortnightly', 'monthly', 'pay fortnightly', 'pay faster', 'save interest frequency',
    ],
  },
  {
    id: 'contact-locations',
    category: 'faq',
    title: 'Mortgage House Contact and Locations',
    content:
      'Mortgage House is an Australian non-bank lender headquartered in Sydney, NSW, with brokers and offices across Australia in all major states and territories. ' +
      'To find your nearest Mortgage House location or speak with a broker: ' +
      'call 133 144 (Mon–Fri 8am–7pm, Sat 9am–5pm AEST), ' +
      'visit mortgagehouse.com.au/find-a-broker, or email info@mortgagehouse.com.au. ' +
      'You can also request a callback online at mortgagehouse.com.au.',
    keywords: [
      'location', 'locations', 'office', 'offices', 'branch', 'branches',
      'where', 'address', 'contact', 'phone number', 'email', 'find a broker',
      'nearest', 'near me', 'sydney', 'headquarters', 'open hours', 'trading hours',
    ],
  },
]
