import { defineStore } from 'pinia'

function getLineTotal(quantity, price) {
  return Number(quantity || 0) * Number(price || 0)
}

function createInvoiceId(period, index) {
  return `INV-${period.replace('-', '')}-${String(index + 1).padStart(3, '0')}`
}

function getInvoiceDueDate(period) {
  return `${period}-20`
}

function getPreviousEnabledStep(configuration, stepId) {
  if (!configuration) return null

  const enabledSteps = configuration.steps.filter((step) => step.enabled)
  const currentIndex = enabledSteps.findIndex((step) => step.id === stepId)

  if (currentIndex <= 0) return null

  return enabledSteps[currentIndex - 1]
}

function getStepDependencySummary(step, previousStep) {
  if (step.type === 'monthly_recurring') {
    return previousStep
      ? `Runs after ${previousStep.name} so recurring charges are layered onto the same billing run.`
      : 'Starts the billing run by loading recurring subscription and retainer charges.'
  }

  if (step.type === 'one_time_charges') {
    return previousStep
      ? `Waits for ${previousStep.name} to complete so approved setup and milestone charges can be appended next.`
      : 'Starts by pulling approved one-time charges into the billing period.'
  }

  if (step.type === 'usage_reconciliation') {
    return previousStep
      ? `Begins after ${previousStep.name} so usage-based charges are calculated on top of the base bill.`
      : 'Starts by reconciling metered usage for the selected period.'
  }

  if (step.type === 'discounts_credits') {
    return previousStep
      ? `Runs after ${previousStep.name} so credits can offset the charges already assembled.`
      : 'Starts by applying approved credits and discount lines.'
  }

  if (step.type === 'minimum_commitments') {
    return previousStep
      ? `Waits for ${previousStep.name} so minimum commitment shortfalls can be calculated from the prior charges.`
      : 'Starts by checking whether billed usage meets the contracted minimum.'
  }

  if (step.type === 'late_fees') {
    return previousStep
      ? `Runs after ${previousStep.name} once overdue balances have been identified for finance charges.`
      : 'Starts by evaluating overdue balances for eligible late fees.'
  }

  if (step.type === 'taxes') {
    return previousStep
      ? `Waits for ${previousStep.name} so taxes are calculated only after taxable charges are fully assembled.`
      : 'Starts by calculating taxes on the charges included in this period.'
  }

  if (step.type === 'manual_adjustments') {
    return previousStep
      ? `Runs after ${previousStep.name} so finance adjustments are applied to the near-final bill.`
      : 'Starts by applying queued finance adjustments to this billing period.'
  }

  if (step.type === 'invoice_finalization') {
    return previousStep
      ? `Waits for ${previousStep.name} and every earlier step before preparing invoice drafts for release.`
      : 'Starts by preparing invoice drafts for final review and release.'
  }

  return previousStep
    ? `Runs immediately after ${previousStep.name} completes.`
    : 'Starts as soon as the billing run begins.'
}

function buildPreRunStepMessage(step, configuration) {
  const previousStep = getPreviousEnabledStep(configuration, step.id)
  const dependencySummary = getStepDependencySummary(step, previousStep)

  if (!previousStep) {
    return `${dependencySummary} Demo mode adds a random 1-4 second delay before it completes.`
  }

  return `${dependencySummary} In demo mode it begins about 1-4 seconds after ${previousStep.name} finishes.`
}

function buildQueuedStepMessage(step, configuration) {
  const previousStep = getPreviousEnabledStep(configuration, step.id)

  if (!previousStep) {
    return 'Queued at the front of the run and will begin as soon as the current demo step clears.'
  }

  return `Waiting for ${previousStep.name} to finish. In demo mode this step will start about 1-4 seconds later.`
}

function buildRunningStepMessage(step, configuration) {
  const previousStep = getPreviousEnabledStep(configuration, step.id)
  const dependencySummary = getStepDependencySummary(step, previousStep)

  return `${dependencySummary} Demo mode is simulating this step right now with a random 1-4 second delay.`
}

function getChargeTotalForCategories(accounts, categories, consumedCategories = new Set()) {
  if (!categories.length) return 0

  return accounts.reduce((sum, account) => {
    return (
      sum +
      account.chargeTemplates.reduce((accountSum, item) => {
        if (!categories.includes(item.category) || consumedCategories.has(item.category)) {
          return accountSum
        }

        return accountSum + getLineTotal(item.quantity, item.price)
      }, 0)
    )
  }, 0)
}

function getStepContributionAmount(step, runningSubtotal, accounts, consumedCategories) {
  const catalogEntry = stepCatalogMap[step.type]

  if (!step.enabled) return 0

  if (step.type === 'taxes') {
    return runningSubtotal * 0.0825
  }

  if (!catalogEntry.chargeCategories.length) {
    return 0
  }

  const amount = getChargeTotalForCategories(accounts, catalogEntry.chargeCategories, consumedCategories)

  catalogEntry.chargeCategories.forEach((category) => {
    consumedCategories.add(category)
  })

  return amount
}

function getRunAmountSummary(configuration, accounts, activeStepId = null) {
  if (!configuration) {
    return {
      estimatedTotal: 0,
      completedAmount: 0,
      activeAmount: 0,
      currentTotal: 0,
    }
  }

  const consumedForEstimate = new Set()
  let estimatedRunningTotal = 0

  for (const step of configuration.steps) {
    estimatedRunningTotal += getStepContributionAmount(
      step,
      estimatedRunningTotal,
      accounts,
      consumedForEstimate,
    )
  }

  if (!activeStepId) {
    return {
      estimatedTotal: estimatedRunningTotal,
      completedAmount: 0,
      activeAmount: 0,
      currentTotal: 0,
    }
  }

  const consumedForProgress = new Set()
  let progressRunningTotal = 0
  let completedAmount = 0
  let activeAmount = 0

  for (const step of configuration.steps) {
    const contribution = getStepContributionAmount(
      step,
      progressRunningTotal,
      accounts,
      consumedForProgress,
    )

    if (!step.enabled) continue

    if (step.id === activeStepId) {
      activeAmount = contribution
      progressRunningTotal += contribution
      break
    }

    completedAmount += contribution
    progressRunningTotal += contribution
  }

  return {
    estimatedTotal: estimatedRunningTotal,
    completedAmount,
    activeAmount,
    currentTotal: progressRunningTotal,
  }
}

/**
 * Demo-only helper.
 * Simulates backend billing work so the UI can show visible progress.
 */
function waitForDemoStepDelay() {
  const delay = 1000 + Math.floor(Math.random() * 3000)
  return new Promise((resolve) => {
    setTimeout(resolve, delay)
  })
}

const stepCatalog = [
  {
    type: 'monthly_recurring',
    label: 'Monthly Billing',
    description: 'Bills recurring subscription and retainer charges for the period.',
    chargeCategories: ['recurring'],
    settingsSchema: [
      {
        key: 'timing',
        label: 'Timing',
        type: 'select',
        options: ['In advance', 'In arrears'],
        defaultValue: 'In advance',
      },
      {
        key: 'proration',
        label: 'Proration',
        type: 'select',
        options: ['None', 'Daily', 'Monthly'],
        defaultValue: 'Daily',
      },
    ],
  },
  {
    type: 'one_time_charges',
    label: 'One-Time Billing',
    description: 'Includes approved setup work, installations, and milestone charges.',
    chargeCategories: ['one-time'],
    settingsSchema: [
      {
        key: 'source',
        label: 'Source',
        type: 'text',
        defaultValue: 'Approved work orders',
      },
      {
        key: 'includePending',
        label: 'Include Pending',
        type: 'select',
        options: ['No', 'Yes'],
        defaultValue: 'No',
      },
    ],
  },
  {
    type: 'usage_reconciliation',
    label: 'Usage Reconciliation',
    description: 'Adds usage-based or metered charges for the selected period.',
    chargeCategories: ['usage'],
    settingsSchema: [
      {
        key: 'source',
        label: 'Usage Source',
        type: 'text',
        defaultValue: 'Platform usage export',
      },
      {
        key: 'window',
        label: 'Usage Window',
        type: 'select',
        options: ['Calendar month', 'Contract month'],
        defaultValue: 'Calendar month',
      },
    ],
  },
  {
    type: 'discounts_credits',
    label: 'Discounts and Credits',
    description: 'Applies service credits, discount lines, and commercial concessions.',
    chargeCategories: ['credit'],
    settingsSchema: [
      {
        key: 'approval',
        label: 'Approval',
        type: 'select',
        options: ['Manager approval', 'Finance approval'],
        defaultValue: 'Manager approval',
      },
      {
        key: 'cap',
        label: 'Credit Cap',
        type: 'text',
        defaultValue: '$1,000',
      },
    ],
  },
  {
    type: 'minimum_commitments',
    label: 'Minimum Commitments',
    description: 'Brings invoices up to committed minimums when usage falls short.',
    chargeCategories: ['minimum'],
    settingsSchema: [
      {
        key: 'basis',
        label: 'Commit Basis',
        type: 'select',
        options: ['Monthly commit', 'Quarterly averaged'],
        defaultValue: 'Monthly commit',
      },
      {
        key: 'label',
        label: 'Line Label',
        type: 'text',
        defaultValue: 'Minimum commitment adjustment',
      },
    ],
  },
  {
    type: 'late_fees',
    label: 'Late Fees',
    description: 'Adds overdue finance charges for eligible delinquent accounts.',
    chargeCategories: ['fee'],
    settingsSchema: [
      {
        key: 'rate',
        label: 'Fee Rate',
        type: 'text',
        defaultValue: '1.5%',
      },
      {
        key: 'graceDays',
        label: 'Grace Days',
        type: 'text',
        defaultValue: '10',
      },
    ],
  },
  {
    type: 'taxes',
    label: 'Taxes',
    description: 'Calculates taxes based on the account tax profile and jurisdiction.',
    chargeCategories: [],
    settingsSchema: [
      {
        key: 'mode',
        label: 'Tax Mode',
        type: 'select',
        options: ['Estimate', 'Jurisdiction engine'],
        defaultValue: 'Estimate',
      },
      {
        key: 'label',
        label: 'Tax Label',
        type: 'text',
        defaultValue: 'Sales tax',
      },
    ],
  },
  {
    type: 'manual_adjustments',
    label: 'Manual Adjustments',
    description: 'Includes approved ad hoc adjustments or customer-specific charges.',
    chargeCategories: ['adjustment'],
    settingsSchema: [
      {
        key: 'source',
        label: 'Adjustment Source',
        type: 'text',
        defaultValue: 'Finance adjustment queue',
      },
      {
        key: 'approval',
        label: 'Approval Required',
        type: 'select',
        options: ['Yes', 'No'],
        defaultValue: 'Yes',
      },
    ],
  },
  {
    type: 'invoice_finalization',
    label: 'Invoice Finalization',
    description: 'Final review step before invoices are released to AR or customers.',
    chargeCategories: [],
    settingsSchema: [
      {
        key: 'reviewOwner',
        label: 'Review Owner',
        type: 'text',
        defaultValue: 'Finance operations',
      },
      {
        key: 'releaseMode',
        label: 'Release Mode',
        type: 'select',
        options: ['Draft only', 'Ready to send'],
        defaultValue: 'Draft only',
      },
    ],
  },
]

const stepCatalogMap = Object.fromEntries(stepCatalog.map((step) => [step.type, step]))

function createSettingsFromSchema(schema) {
  return Object.fromEntries(schema.map((field) => [field.key, field.defaultValue]))
}

function createConfigurationStep(type, overrides = {}) {
  const catalogEntry = stepCatalogMap[type]

  return {
    id: overrides.id ?? crypto.randomUUID(),
    type,
    name: overrides.name ?? catalogEntry.label,
    description: overrides.description ?? catalogEntry.description,
    enabled: overrides.enabled ?? true,
    settings: {
      ...createSettingsFromSchema(catalogEntry.settingsSchema),
      ...(overrides.settings ?? {}),
    },
  }
}

function createRunSchedule(overrides = {}) {
  return {
    mode: overrides.mode ?? 'manual',
    dayOfPeriod: overrides.dayOfPeriod ?? '1',
    timeOfDay: overrides.timeOfDay ?? '03:00',
    demoScheduledAt: overrides.demoScheduledAt ?? null,
  }
}

function createConfiguration(id, name, cadence, description, steps, schedule = {}) {
  return {
    id,
    name,
    cadence,
    description,
    steps,
    runSchedule: createRunSchedule(schedule),
  }
}

const demoNow = new Date()

const seedConfigurations = [
  createConfiguration(
    'cfg-monthly-saas',
    'Monthly SaaS Standard',
    'Monthly',
    'Recurring SaaS subscriptions with optional onboarding and taxes.',
    [
      createConfigurationStep('monthly_recurring', {
        id: 'step-monthly-1',
        settings: {
          timing: 'In advance',
          proration: 'Daily',
        },
      }),
      createConfigurationStep('one_time_charges', {
        id: 'step-one-time-1',
        name: 'Installations and Setup',
        settings: {
          source: 'Approved implementation queue',
          includePending: 'No',
        },
      }),
      createConfigurationStep('taxes', {
        id: 'step-taxes-1',
        settings: {
          mode: 'Estimate',
          label: 'Sales tax',
        },
      }),
      createConfigurationStep('invoice_finalization', {
        id: 'step-finalize-1',
      }),
    ],
    { mode: 'manual' },
  ),
  createConfiguration(
    'cfg-managed-services',
    'Managed Services Billing',
    'Monthly',
    'Recurring retainers, usage overages, credits, and final review.',
    [
      createConfigurationStep('monthly_recurring', {
        id: 'step-monthly-2',
        name: 'Monthly Service Retainers',
      }),
      createConfigurationStep('usage_reconciliation', {
        id: 'step-usage-2',
      }),
      createConfigurationStep('discounts_credits', {
        id: 'step-credit-2',
      }),
      createConfigurationStep('invoice_finalization', {
        id: 'step-finalize-2',
      }),
    ],
    { mode: 'manual' },
  ),
  createConfiguration(
    'cfg-enterprise-platform',
    'Enterprise Platform Reconciliation',
    'Monthly',
    'Enterprise usage, minimums, manual adjustments, taxes, and release.',
    [
      createConfigurationStep('usage_reconciliation', {
        id: 'step-usage-3',
      }),
      createConfigurationStep('minimum_commitments', {
        id: 'step-minimum-3',
      }),
      createConfigurationStep('manual_adjustments', {
        id: 'step-adjustment-3',
      }),
      createConfigurationStep('taxes', {
        id: 'step-taxes-3',
        settings: {
          mode: 'Jurisdiction engine',
          label: 'Jurisdiction tax',
        },
      }),
      createConfigurationStep('invoice_finalization', {
        id: 'step-finalize-3',
      }),
    ],
    { mode: 'manual' },
  ),
  createConfiguration(
    'cfg-demo-scheduled-long',
    'Demo Scheduled Run - Future Window',
    'Monthly',
    'Demo configuration that shows a long scheduled countdown relative to page load.',
    [
      createConfigurationStep('monthly_recurring', {
        id: 'step-monthly-4',
      }),
      createConfigurationStep('one_time_charges', {
        id: 'step-one-time-4',
        name: 'Implementation Backlog',
      }),
      createConfigurationStep('taxes', {
        id: 'step-taxes-4',
      }),
      createConfigurationStep('invoice_finalization', {
        id: 'step-finalize-4',
      }),
    ],
    {
      mode: 'scheduled',
      dayOfPeriod: String(demoNow.getDate()),
      timeOfDay: '03:00',
      demoScheduledAt: new Date(demoNow.getTime() + (21 * 24 + 8) * 60 * 60 * 1000).toISOString(),
    },
  ),
  createConfiguration(
    'cfg-demo-scheduled-soon',
    'Demo Scheduled Run - 45 Second Trigger',
    'Monthly',
    'Demo configuration that auto-runs shortly after page load so the scheduler is easy to demo.',
    [
      createConfigurationStep('monthly_recurring', {
        id: 'step-monthly-5',
      }),
      createConfigurationStep('usage_reconciliation', {
        id: 'step-usage-5',
      }),
      createConfigurationStep('taxes', {
        id: 'step-taxes-5',
      }),
      createConfigurationStep('invoice_finalization', {
        id: 'step-finalize-5',
      }),
    ],
    {
      mode: 'scheduled',
      dayOfPeriod: String(demoNow.getDate()),
      timeOfDay: '03:00',
      demoScheduledAt: new Date(demoNow.getTime() + 45 * 1000).toISOString(),
    },
  ),
]

const accountNamePartsA = [
  'Acme', 'Northwind', 'Summit', 'Bluebird', 'Helio', 'Atlas', 'Evergreen', 'Cinder',
  'Meridian', 'Cobalt', 'Silverline', 'Harbor', 'Maple', 'Delta', 'Prairie', 'Aurora',
  'Pioneer', 'Vertex', 'Beacon', 'Redwood',
]

const accountNamePartsB = [
  'Industries', 'Logistics', 'Retail', 'Health', 'Commerce', 'Capital', 'Systems', 'Labs',
  'Partners', 'Dynamics', 'Network', 'Analytics', 'Works', 'Solutions', 'Group', 'Energy',
  'Foods', 'Holdings', 'Ventures', 'Services',
]

const accountOwners = ['Nina Patel', 'Owen Carter', 'Elena Park', 'Marcus Lee', 'Jade Nguyen', 'Priya Shah']
const accountStatuses = ['Active', 'Active', 'Active', 'Pending Review', 'Past Due']

const accountBlueprints = {
  'cfg-monthly-saas': [
    {
      description: 'Platform Subscription',
      quantity: 1,
      price: 499,
      category: 'recurring',
    },
    {
      description: 'Implementation Services',
      quantity: 6,
      price: 150,
      category: 'one-time',
    },
    {
      description: 'Onboarding Credit',
      quantity: 1,
      price: -120,
      category: 'credit',
    },
  ],
  'cfg-managed-services': [
    {
      description: 'Support Retainer',
      quantity: 1,
      price: 950,
      category: 'recurring',
    },
    {
      description: 'Usage Overage',
      quantity: 900,
      price: 0.14,
      category: 'usage',
    },
    {
      description: 'Service Recovery Credit',
      quantity: 1,
      price: -85,
      category: 'credit',
    },
  ],
  'cfg-enterprise-platform': [
    {
      description: 'Platform Usage',
      quantity: 1,
      price: 3100,
      category: 'usage',
    },
    {
      description: 'Minimum Commitment Floor',
      quantity: 1,
      price: 650,
      category: 'minimum',
    },
    {
      description: 'Manual Finance Adjustment',
      quantity: 1,
      price: 145,
      category: 'adjustment',
    },
  ],
  'cfg-demo-scheduled-long': [
    {
      description: 'Demo Subscription Bundle',
      quantity: 1,
      price: 780,
      category: 'recurring',
    },
    {
      description: 'Deferred Setup Charge',
      quantity: 1,
      price: 420,
      category: 'one-time',
    },
    {
      description: 'Launch Credit',
      quantity: 1,
      price: -90,
      category: 'credit',
    },
  ],
  'cfg-demo-scheduled-soon': [
    {
      description: 'Automation Subscription',
      quantity: 1,
      price: 640,
      category: 'recurring',
    },
    {
      description: 'Usage Burst',
      quantity: 700,
      price: 0.16,
      category: 'usage',
    },
    {
      description: 'Finance Adjustment',
      quantity: 1,
      price: 55,
      category: 'adjustment',
    },
  ],
}

function createChargeTemplates(configurationId, index) {
  const blueprint = accountBlueprints[configurationId] ?? []

  return blueprint.map((item, itemIndex) => {
    const quantityBump = index % 3
    const priceBump = (index % 5) * 12

    return {
      description: item.description,
      quantity:
        item.category === 'usage'
          ? item.quantity + quantityBump * 110
          : item.quantity + (itemIndex === 0 ? quantityBump % 2 : 0),
      price:
        item.price < 0
          ? item.price - (index % 4) * 10
          : item.price + (item.category === 'usage' ? (index % 4) * 0.01 : priceBump),
      category: item.category,
    }
  })
}

function createSeedAccount(index, configurationId) {
  const accountNumber = 1001 + index
  const baseName = `${accountNamePartsA[index % accountNamePartsA.length]} ${accountNamePartsB[(index * 3) % accountNamePartsB.length]}`
  const owner = accountOwners[index % accountOwners.length]
  const status = accountStatuses[index % accountStatuses.length]

  return {
    id: `acct-${accountNumber}`,
    name: `${baseName} ${Math.floor(index / accountNamePartsA.length) + 1}`,
    billingEmail: `billing${accountNumber}@${baseName.toLowerCase().replace(/\s+/g, '')}.example`,
    status,
    configurationId,
    owner,
    lastBilledPeriod: index % 7 === 0 ? '2026-02' : '2026-03',
    chargeTemplates: createChargeTemplates(configurationId, index),
  }
}

const seedAccounts = Array.from({ length: 270 }, (_, index) => {
  const configurationIds = [
    'cfg-monthly-saas',
    'cfg-managed-services',
    'cfg-enterprise-platform',
    'cfg-demo-scheduled-long',
    'cfg-demo-scheduled-soon',
  ]
  return createSeedAccount(index, configurationIds[index % configurationIds.length])
})

function getPreviousPeriod(period, monthsBack = 1) {
  const [year, month] = period.split('-').map(Number)
  const date = new Date(year, month - 1 - monthsBack, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getScheduledRunDate(configuration, period) {
  if (!configuration || configuration.runSchedule.mode !== 'scheduled') return null

  if (configuration.runSchedule.demoScheduledAt && period === initialPeriod) {
    return new Date(configuration.runSchedule.demoScheduledAt)
  }

  const [year, month] = period.split('-').map(Number)
  const day = Math.min(Math.max(Number(configuration.runSchedule.dayOfPeriod || 1), 1), 28)
  const [hours, minutes] = String(configuration.runSchedule.timeOfDay || '03:00')
    .split(':')
    .map(Number)

  return new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0)
}

function getScheduledCountdownParts(targetDate, nowTs) {
  if (!targetDate) return null

  const diffMs = Math.max(targetDate.getTime() - nowTs, 0)
  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const minutes = Math.floor((totalSeconds % 86400) / 60)
  const seconds = totalSeconds % 60

  return {
    days,
    minutes,
    seconds,
    totalSeconds,
  }
}

function getHistoryLengthForAccount(account) {
  const accountNumber = Number(account.id.replace('acct-', ''))
  return 12 + (accountNumber % 49)
}

function getHistoricalChargeTemplates(account, period) {
  const periodSeed = Number(period.replace('-', ''))

  return account.chargeTemplates.map((item, index) => {
    const quantityVariant = (periodSeed + index) % 3
    const priceVariant = (periodSeed + index * 7) % 4

    return {
      ...item,
      quantity:
        item.category === 'usage'
          ? item.quantity + quantityVariant * 90
          : item.quantity + (index === 0 ? quantityVariant % 2 : 0),
      price:
        item.price < 0
          ? item.price - priceVariant * 5
          : item.price + (item.category === 'usage' ? priceVariant * 0.01 : priceVariant * 8),
    }
  })
}

function createHistoricalInvoiceFromAccount(account, configuration, period, index) {
  const categories = getEnabledChargeCategories(configuration)
  const lineItems = getHistoricalChargeTemplates(account, period)
    .filter((item) => categories.includes(item.category))
    .map((item, itemIndex) => ({
      id: itemIndex + 1,
      description: item.description,
      quantity: item.quantity,
      price: item.price,
    }))

  return {
    id: createInvoiceId(period, index),
    configurationId: configuration.id,
    period,
    accountId: account.id,
    customer: account.name,
    status: 'Paid',
    dueDate: getInvoiceDueDate(period),
    notes: `Historical run for ${period} using ${configuration.name}.`,
    lineItems,
  }
}

function getEnabledSteps(configuration) {
  return configuration.steps.filter((step) => step.enabled)
}

function getEnabledChargeCategories(configuration) {
  return [...new Set(getEnabledSteps(configuration).flatMap((step) => stepCatalogMap[step.type].chargeCategories))]
}

function createInvoiceFromAccount(account, configuration, period, index) {
  const categories = getEnabledChargeCategories(configuration)
  const lineItems = account.chargeTemplates
    .filter((item) => categories.includes(item.category))
    .map((item, itemIndex) => ({
      id: itemIndex + 1,
      description: item.description,
      quantity: item.quantity,
      price: item.price,
    }))

  return {
    id: createInvoiceId(period, index),
    configurationId: configuration.id,
    period,
    accountId: account.id,
    customer: account.name,
    status: 'Draft',
    dueDate: getInvoiceDueDate(period),
    notes: `Generated for ${period} using ${configuration.name}.`,
    lineItems,
  }
}

function buildStepRunSummary(step, accountCount, invoiceCount, configuration) {
  const catalogEntry = stepCatalogMap[step.type]

  if (!step.enabled) {
    return {
      ...step,
      status: 'Skipped',
      result: 'Step disabled for this configuration.',
    }
  }

  if (step.type === 'invoice_finalization') {
    return {
      ...step,
      status: 'Completed',
      result: `${invoiceCount} invoice drafts left in ${step.settings.releaseMode.toLowerCase()} mode.`,
    }
  }

  if (step.type === 'taxes') {
    return {
      ...step,
      status: 'Completed',
      result: `Tax rules applied to ${invoiceCount} invoice draft(s) using ${step.settings.mode.toLowerCase()}.`,
    }
  }

  return {
    ...step,
    status: 'Completed',
    result: `${catalogEntry.label} processed across ${accountCount} matched account(s).`,
  }
}

const initialConfiguration = seedConfigurations[0]
const initialPeriod = '2026-04'
const historicalPeriods = Array.from({ length: 60 }, (_, index) => getPreviousPeriod(initialPeriod, index + 1))

function getInvoiceTotal(invoice, configuration) {
  const subtotal = invoice.lineItems.reduce((sum, item) => {
    return sum + getLineTotal(item.quantity, item.price)
  }, 0)

  const hasTaxesStep = getEnabledSteps(configuration).some((step) => step.type === 'taxes')
  return subtotal + (hasTaxesStep ? subtotal * 0.0825 : 0)
}

const seededHistoricalInvoices = seedConfigurations.flatMap((configuration) => {
  const accountsForConfiguration = seedAccounts.filter(
    (account) => account.configurationId === configuration.id && account.status === 'Active',
  )

  return historicalPeriods.flatMap((period) => {
    const eligibleAccounts = accountsForConfiguration.filter((account) => {
      const accountHistoryPeriods = getHistoryLengthForAccount(account)
      const periodIndex = historicalPeriods.indexOf(period)
      return periodIndex >= 0 && periodIndex < accountHistoryPeriods
    })

    return eligibleAccounts.map((account, index) =>
      createHistoricalInvoiceFromAccount(account, configuration, period, index),
    )
  })
})

const seededHistoricalRuns = seedConfigurations.flatMap((configuration) => {
  return historicalPeriods.flatMap((period) => {
    const invoicesForRun = seededHistoricalInvoices.filter(
      (invoice) => invoice.configurationId === configuration.id && invoice.period === period,
    )

    if (!invoicesForRun.length) {
      return []
    }

    return {
      configurationId: configuration.id,
      period,
      invoiceCount: invoicesForRun.length,
      accountCount: invoicesForRun.length,
      ranAt: `${period}-28T16:00:00.000Z`,
      totalAmount: invoicesForRun.reduce((sum, invoice) => {
        return sum + getInvoiceTotal(invoice, configuration)
      }, 0),
      steps: configuration.steps.map((step) =>
        buildStepRunSummary(step, invoicesForRun.length, invoicesForRun.length, configuration),
      ),
    }
  })
})

export const useInvoiceStore = defineStore('invoice', {
  state: () => ({
    stepCatalog,
    configurations: seedConfigurations,
    accounts: seedAccounts,
    /**
     * Demo-only reset behavior:
     * the current open billing period starts unrun, while prior periods
     * include seeded history so the user can review past runs.
     */
    invoices: seededHistoricalInvoices,
    billingRuns: seededHistoricalRuns,
    selectedConfigurationId: initialConfiguration.id,
    selectedInvoiceId: null,
    billingPeriod: initialPeriod,
    nowTs: Date.now(),
    isBillingRunInProgress: false,
    activeRunStepId: null,
  }),

  getters: {
    selectedConfiguration(state) {
      return state.configurations.find((configuration) => configuration.id === state.selectedConfigurationId) || null
    },

    matchingAccounts(state) {
      return state.accounts.filter((account) => account.configurationId === state.selectedConfigurationId)
    },

    configurationInvoices(state) {
      return state.invoices.filter(
        (invoice) =>
          invoice.configurationId === state.selectedConfigurationId && invoice.period === state.billingPeriod,
      )
    },

    selectedInvoice() {
      return this.configurationInvoices.find((invoice) => invoice.id === this.selectedInvoiceId) || null
    },

    selectedSubtotal() {
      if (!this.selectedInvoice) return 0

      return this.selectedInvoice.lineItems.reduce((total, item) => {
        return total + getLineTotal(item.quantity, item.price)
      }, 0)
    },

    selectedTax() {
      if (!this.selectedConfiguration) return 0

      const hasTaxesStep = getEnabledSteps(this.selectedConfiguration).some((step) => step.type === 'taxes')
      return hasTaxesStep ? this.selectedSubtotal * 0.0825 : 0
    },

    selectedGrandTotal() {
      return this.selectedSubtotal + this.selectedTax
    },

    selectedBillingRun(state) {
      return (
        [...state.billingRuns]
          .reverse()
          .find(
            (run) =>
              run.configurationId === state.selectedConfigurationId && run.period === state.billingPeriod,
          ) || null
      )
    },

    selectedChargeCategories() {
      if (!this.selectedConfiguration) return []

      return getEnabledChargeCategories(this.selectedConfiguration)
    },

    selectedScheduleSummary(state) {
      if (!this.selectedConfiguration) {
        return {
          isScheduled: false,
          scheduledFor: null,
          isDue: false,
          countdown: null,
        }
      }

      const scheduledFor = getScheduledRunDate(this.selectedConfiguration, state.billingPeriod)
      const countdown = getScheduledCountdownParts(scheduledFor, state.nowTs)

      return {
        isScheduled: this.selectedConfiguration.runSchedule.mode === 'scheduled',
        scheduledFor,
        isDue: Boolean(scheduledFor) && scheduledFor.getTime() <= state.nowTs,
        countdown,
      }
    },

    selectedRunAmountSummary() {
      if (!this.selectedConfiguration) {
        return {
          estimatedTotal: 0,
          completedAmount: 0,
          activeAmount: 0,
          currentTotal: 0,
          finalInvoicedAmount: this.selectedBillingRun?.totalAmount ?? 0,
        }
      }

      const amountSummary = getRunAmountSummary(
        this.selectedConfiguration,
        this.matchingAccounts,
        this.isBillingRunInProgress ? this.activeRunStepId : null,
      )

      return {
        ...amountSummary,
        finalInvoicedAmount: this.selectedBillingRun?.totalAmount ?? 0,
      }
    },

    billingRunProgress() {
      if (this.isBillingRunInProgress && this.selectedConfiguration) {
        return this.selectedConfiguration.steps.map((step) => {
          if (!step.enabled) {
            return {
              ...step,
              status: 'Skipped',
              result: 'Step disabled for this configuration.',
            }
          }

          if (step.id === this.activeRunStepId) {
            return {
              ...step,
              status: 'Running',
              result: buildRunningStepMessage(step, this.selectedConfiguration),
            }
          }

          const activeStepIndex = this.selectedConfiguration.steps.findIndex(
            (item) => item.id === this.activeRunStepId,
          )
          const currentStepIndex = this.selectedConfiguration.steps.findIndex(
            (item) => item.id === step.id,
          )

          if (activeStepIndex > currentStepIndex) {
            return {
              ...step,
              status: 'Completed',
              result: 'Step finished during the current demo billing run.',
            }
          }

          return {
            ...step,
            status: 'Queued',
            result: buildQueuedStepMessage(step, this.selectedConfiguration),
          }
        })
      }

      if (this.selectedBillingRun) {
        return this.selectedBillingRun.steps
      }

      if (!this.selectedConfiguration) return []

      return this.selectedConfiguration.steps.map((step) => ({
        ...step,
        status: step.enabled ? 'Ready' : 'Skipped',
        result: step.enabled
          ? buildPreRunStepMessage(step, this.selectedConfiguration)
          : 'Step disabled for this configuration.',
      }))
    },
  },

  actions: {
    selectConfiguration(configurationId) {
      this.selectedConfigurationId = configurationId
      this.selectedInvoiceId = this.configurationInvoices[0]?.id ?? null
    },

    selectInvoice(invoiceId) {
      this.selectedInvoiceId = invoiceId
    },

    setBillingPeriod(period) {
      this.billingPeriod = period
      this.selectedInvoiceId = this.configurationInvoices[0]?.id ?? null
    },

    updateSelectedConfigurationField(field, value) {
      if (!this.selectedConfiguration) return
      this.selectedConfiguration[field] = value
    },

    updateSelectedConfigurationScheduleField(field, value) {
      if (!this.selectedConfiguration) return
      this.selectedConfiguration.runSchedule[field] = value
    },

    tickNow() {
      this.nowTs = Date.now()
    },

    maybeRunScheduledBilling() {
      if (
        !this.selectedConfiguration ||
        !this.selectedScheduleSummary.isScheduled ||
        !this.selectedScheduleSummary.isDue ||
        this.selectedBillingRun ||
        this.isBillingRunInProgress
      ) {
        return
      }

      this.runBilling()
    },

    addStepToSelectedConfiguration(type) {
      if (!this.selectedConfiguration || !stepCatalogMap[type]) return
      this.selectedConfiguration.steps.push(createConfigurationStep(type))
    },

    removeSelectedConfigurationStep(stepId) {
      if (!this.selectedConfiguration) return

      this.selectedConfiguration.steps = this.selectedConfiguration.steps.filter((step) => step.id !== stepId)
    },

    moveSelectedConfigurationStep(stepId, direction) {
      if (!this.selectedConfiguration) return

      const currentIndex = this.selectedConfiguration.steps.findIndex((step) => step.id === stepId)
      if (currentIndex < 0) return

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (targetIndex < 0 || targetIndex >= this.selectedConfiguration.steps.length) return

      const steps = [...this.selectedConfiguration.steps]
      const [step] = steps.splice(currentIndex, 1)
      steps.splice(targetIndex, 0, step)
      this.selectedConfiguration.steps = steps
    },

    updateSelectedConfigurationStepField(stepId, field, value) {
      if (!this.selectedConfiguration) return

      const step = this.selectedConfiguration.steps.find((item) => item.id === stepId)
      if (!step) return

      step[field] = value
    },

    updateSelectedConfigurationStepSetting(stepId, key, value) {
      if (!this.selectedConfiguration) return

      const step = this.selectedConfiguration.steps.find((item) => item.id === stepId)
      if (!step) return

      step.settings[key] = value
    },

    async runBilling() {
      if (!this.selectedConfiguration || this.isBillingRunInProgress) return

      this.isBillingRunInProgress = true
      this.activeRunStepId = null

      try {
        for (const step of this.selectedConfiguration.steps) {
          if (!step.enabled) continue

          this.activeRunStepId = step.id
          await waitForDemoStepDelay()
        }

        const generatedInvoices = this.matchingAccounts.map((account, index) =>
          createInvoiceFromAccount(account, this.selectedConfiguration, this.billingPeriod, index),
        )

        this.invoices = this.invoices
          .filter(
            (invoice) =>
              !(
                invoice.configurationId === this.selectedConfiguration.id &&
                invoice.period === this.billingPeriod
              ),
          )
          .concat(generatedInvoices)

        const run = {
          configurationId: this.selectedConfiguration.id,
          period: this.billingPeriod,
          invoiceCount: generatedInvoices.length,
          accountCount: this.matchingAccounts.length,
          ranAt: new Date().toISOString(),
          totalAmount: generatedInvoices.reduce((sum, invoice) => {
            const subtotal = invoice.lineItems.reduce((invoiceSum, item) => {
              return invoiceSum + getLineTotal(item.quantity, item.price)
            }, 0)
            const tax = getEnabledSteps(this.selectedConfiguration).some((step) => step.type === 'taxes')
              ? subtotal * 0.0825
              : 0

            return sum + subtotal + tax
          }, 0),
          steps: this.selectedConfiguration.steps.map((step) =>
            buildStepRunSummary(
              step,
              this.matchingAccounts.length,
              generatedInvoices.length,
              this.selectedConfiguration,
            ),
          ),
        }

        this.billingRuns = this.billingRuns.filter(
          (existingRun) =>
            !(
              existingRun.configurationId === this.selectedConfiguration.id &&
              existingRun.period === this.billingPeriod
            ),
        )

        this.billingRuns.push(run)
        this.selectedInvoiceId = generatedInvoices[0]?.id ?? null
      } finally {
        this.activeRunStepId = null
        this.isBillingRunInProgress = false
      }
    },

    updateSelectedInvoiceField(field, value) {
      if (!this.selectedInvoice) return
      this.selectedInvoice[field] = value
    },

    addLineItem() {
      if (!this.selectedInvoice) return

      const nextId =
        this.selectedInvoice.lineItems.length > 0
          ? Math.max(...this.selectedInvoice.lineItems.map((item) => item.id)) + 1
          : 1

      this.selectedInvoice.lineItems.push({
        id: nextId,
        description: '',
        quantity: 1,
        price: 0,
      })
    },

    removeLineItem(lineItemId) {
      if (!this.selectedInvoice) return

      this.selectedInvoice.lineItems = this.selectedInvoice.lineItems.filter(
        (item) => item.id !== lineItemId,
      )
    },

    updateLineItem(lineItemId, field, value) {
      if (!this.selectedInvoice) return

      const item = this.selectedInvoice.lineItems.find((line) => line.id === lineItemId)
      if (!item) return

      item[field] = field === 'quantity' || field === 'price' ? Number(value) : value
    },
  },
})
