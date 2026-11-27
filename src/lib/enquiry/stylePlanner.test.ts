import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beachDaysOf, plannerPayload, plannerProblems, type PlannerValues } from './stylePlanner';

const base: PlannerValues = {
  days: 4, daysUnsure: false, travelDate: '2030-01-10', dateUnsure: false, adults: 2, children: 0, language: 'en',
  comfort: 'Mid-range', beach: '', beachDays: undefined, fullName: 'Test', email: 't@example.com', phone: '',
  dialCode: '+255', specialRequests: '', whatsappOptIn: false, route: '', hp: ''
};
const step2 = (values: Partial<PlannerValues>) => plannerProblems({ ...base, ...values }, 2, '2030-01-01', false);

test('accommodation is required', () => {
  assert.equal(step2({ comfort: '' }).comfort, 'style_form.err_accommodation');
  assert.equal(step2({ comfort: 'Something else' }).comfort, 'style_form.err_accommodation');
  assert.equal(step2({}).comfort, undefined);
});

test('a yes to the beach needs 1 to 60 beach days; other answers do not', () => {
  assert.equal(step2({ beach: 'Yes' }).beachDays, 'style_form.err_beach_days');
  assert.equal(step2({ beach: 'Yes', beachDays: 0 }).beachDays, 'style_form.err_beach_days');
  assert.equal(step2({ beach: 'Yes', beachDays: 61 }).beachDays, 'style_form.err_beach_days');
  assert.equal(step2({ beach: 'Yes', beachDays: 3 }).beachDays, undefined);
  assert.equal(step2({ beach: 'No' }).beachDays, undefined);
  assert.equal(step2({ beach: 'Not sure yet', beachDays: undefined }).beachDays, undefined);
});

test('beach days reach the team only with a yes', () => {
  const context = { categoryName: 'Safari from Zanzibar', categorySlug: 'safari-from-zanzibar', packageName: '', packageSlug: '', hasRouteOptions: false, pageLocale: 'en', recap: [], attribution: null, pageUrl: 'https://example.com', idempotencyKey: 'test-key-123' };
  const yes = plannerPayload({ ...base, beach: 'Yes', beachDays: 3 }, context).lead_context;
  assert.equal(yes.answers.beach_days, 3);
  assert.equal(yes.beach_days, 3);
  const no = plannerPayload({ ...base, beach: 'No', beachDays: 3 }, context).lead_context;
  assert.equal(no.answers.beach_days, undefined);
  assert.equal(beachDaysOf({ ...base, beach: 'Not sure yet', beachDays: 5 }), undefined);
});
