# P4.5 Extension Marketplace Rollout Policy

Status: official S1 rollout policy.

The public Extension Marketplace must remain blocked until all mandatory controls are enforced.

## Level 1: Internal extensions only

Allowed actors:

- LPB administrators
- internal technical team
- trusted service accounts

Requirements:

- extension registered in the platform registry
- no P0 financial surface
- feature flag required
- admin approval required
- observability enabled
- rollback path documented

Current recommended level: Level 1.

## Level 2: Approved partners

Allowed actors:

- selected partners approved by LPB
- internal administrators

Additional requirements:

- partner identity verification
- security review
- declared API scopes
- declared data access
- sandbox validation
- support contact
- rollback tested
- rate limits defined

## Level 3: Private marketplace by invitation

Allowed actors:

- invited developers
- approved partner organizations
- LPB administrators

Additional requirements:

- provenance signature
- digest integrity check
- versioned changelog
- install policy
- uninstall policy
- emergency disable policy
- validation findings resolved
- staged rollout

## Level 4: Public marketplace

Allowed actors:

- public developers
- marketplace vendors
- partners

Mandatory before activation:

- provenance signature required
- digest integrity required
- security review required
- permission review required
- sandbox run required
- public documentation required
- support policy required
- takedown policy required
- emergency global disable required
- abuse monitoring required
- legal/commercial validation required

## Blocking rules

An extension must be blocked if it requests direct access to:

- wallets
- commissions
- payments
- withdrawals
- financial ledger
- Revenue Engine
- Commission Pool
- financial snapshots
- margin calculations

Any financial extension requires a separate P0 security and finance review.

## Promotion criteria

Move from one level to the next only when:

1. all checks are green for at least one full rollout cycle;
2. no critical observability alert remains open;
3. rollback has been tested;
4. support process is documented;
5. security review is accepted;
6. P0 non-regression scan returns zero functional changes.

## Rollback

Rollback must support:

- disabling a single extension;
- disabling a version;
- disabling a publisher;
- disabling a capability;
- disabling all marketplace installs globally.

## Final S1 decision

P4.5 can remain active for internal and controlled use.

Public marketplace opening: not authorized.
