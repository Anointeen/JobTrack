import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApplicationFormModal } from './ApplicationFormModal';
import { makeApplication } from '../../test/factories';
import type { ApplicationInput } from '../../types';

/**
 * Tag editor behaviour.
 *
 * The editor is hand-rolled rather than a third-party component, so these tests
 * pin the interactions a tagging control is expected to support, and the
 * normalisation rules that keep the stored array clean.
 */

const setup = (initialData: Parameters<typeof makeApplication>[0] | null = null) => {
  const onSave = vi.fn<(data: ApplicationInput) => Promise<void>>().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const user = userEvent.setup();

  render(
    <ApplicationFormModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      initialData={initialData ? makeApplication(initialData) : null}
    />
  );

  return { onSave, onClose, user };
};

const tagInput = () => screen.getByLabelText(/^tags/i);

/** Tag chips carry the .chip-tag class; read their visible text. */
const renderedTags = (): string[] =>
  Array.from(document.querySelectorAll('.chip-tag .chip-text')).map(
    el => el.textContent?.trim() ?? ''
  );

const fillRequired = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/company name/i), 'Globex');
  await user.type(screen.getByLabelText(/job title/i), 'Staff Engineer');
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('creating tags', () => {
  it('creates a tag when Enter is pressed', async () => {
    const { user } = setup();
    await user.type(tagInput(), 'Remote{Enter}');

    expect(renderedTags()).toEqual(['Remote']);
    expect(tagInput()).toHaveValue('');
  });

  it('creates a tag when a comma is typed', async () => {
    const { user } = setup();
    await user.type(tagInput(), 'Referral,');

    expect(renderedTags()).toEqual(['Referral']);
    expect(tagInput()).toHaveValue('');
  });

  it('creates a tag from the Add button', async () => {
    const { user } = setup();
    await user.type(tagInput(), 'Dream Job');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    expect(renderedTags()).toEqual(['Dream Job']);
  });

  it('commits a pending tag on blur', async () => {
    const { user } = setup();
    await user.type(tagInput(), 'Relocation');
    await user.tab();

    await waitFor(() => expect(renderedTags()).toEqual(['Relocation']));
  });

  it('creates several tags from one comma-separated entry', async () => {
    const { user } = setup();
    await user.type(tagInput(), 'Remote, Referral, Graduate Program{Enter}');

    expect(renderedTags()).toEqual(['Remote', 'Referral', 'Graduate Program']);
  });

  it('keeps adding tags in order', async () => {
    const { user } = setup();
    await user.type(tagInput(), 'One{Enter}');
    await user.type(tagInput(), 'Two{Enter}');
    await user.type(tagInput(), 'Three{Enter}');

    expect(renderedTags()).toEqual(['One', 'Two', 'Three']);
  });

  it('disables the Add button until there is something to add', async () => {
    const { user } = setup();
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
    await user.type(tagInput(), 'X');
    expect(screen.getByRole('button', { name: /^add$/i })).toBeEnabled();
  });
});

describe('normalisation', () => {
  it('trims leading and trailing whitespace', async () => {
    const { user } = setup();
    await user.type(tagInput(), '   Remote   {Enter}');

    expect(renderedTags()).toEqual(['Remote']);
  });

  it('collapses internal whitespace runs', async () => {
    const { user } = setup();
    await user.type(tagInput(), 'Dream    Job{Enter}');

    expect(renderedTags()).toEqual(['Dream Job']);
  });

  it('does not create an empty tag from an empty input', async () => {
    const { user } = setup();
    await user.type(tagInput(), '{Enter}');

    expect(renderedTags()).toEqual([]);
  });

  it('does not create a tag from whitespace alone', async () => {
    const { user } = setup();
    await user.type(tagInput(), '     {Enter}');

    expect(renderedTags()).toEqual([]);
    expect(tagInput()).toHaveValue('');
  });

  it('ignores empty segments between commas', async () => {
    const { user } = setup();
    await user.type(tagInput(), 'Remote,,,Referral{Enter}');

    expect(renderedTags()).toEqual(['Remote', 'Referral']);
  });
});

describe('duplicate rejection', () => {
  it('rejects an exact duplicate', async () => {
    const { user } = setup();
    await user.type(tagInput(), 'Remote{Enter}');
    await user.type(tagInput(), 'Remote{Enter}');

    expect(renderedTags()).toEqual(['Remote']);
  });

  it('rejects a duplicate that differs only by case', async () => {
    const { user } = setup();
    await user.type(tagInput(), 'Remote{Enter}');
    await user.type(tagInput(), 'REMOTE{Enter}');

    expect(renderedTags()).toEqual(['Remote']);
  });

  it('rejects a duplicate that differs only by whitespace', async () => {
    const { user } = setup();
    await user.type(tagInput(), 'Dream Job{Enter}');
    await user.type(tagInput(), '  dream   job  {Enter}');

    expect(renderedTags()).toEqual(['Dream Job']);
  });

  it('tells the user why a tag was not added', async () => {
    const { user } = setup();
    await user.type(tagInput(), 'Remote{Enter}');
    await user.type(tagInput(), 'remote{Enter}');

    expect(await screen.findByText(/already added: remote/i)).toBeInTheDocument();
  });

  it('rejects duplicates against tags loaded from an existing application', async () => {
    const { user } = setup({ tags: ['Remote', 'Referral'] });
    await user.type(tagInput(), 'REFERRAL{Enter}');

    expect(renderedTags()).toEqual(['Remote', 'Referral']);
  });
});

describe('removing tags', () => {
  it('removes a tag from its remove control', async () => {
    const { user } = setup({ tags: ['Remote', 'Referral'] });
    await user.click(screen.getByRole('button', { name: /remove tag remote/i }));

    expect(renderedTags()).toEqual(['Referral']);
  });

  it('removes the last tag when Backspace is pressed in an empty input', async () => {
    const { user } = setup();
    await user.type(tagInput(), 'One{Enter}');
    await user.type(tagInput(), 'Two{Enter}');

    await user.click(tagInput());
    await user.keyboard('{Backspace}');

    expect(renderedTags()).toEqual(['One']);
  });

  it('does not remove a tag when Backspace is pressed with text in the input', async () => {
    const { user } = setup();
    await user.type(tagInput(), 'One{Enter}');
    await user.type(tagInput(), 'partial');
    await user.keyboard('{Backspace}');

    expect(renderedTags()).toEqual(['One']);
    expect(tagInput()).toHaveValue('partia');
  });

  it('tolerates Backspace with no tags at all', async () => {
    const { user } = setup();
    await user.click(tagInput());
    await user.keyboard('{Backspace}');

    expect(renderedTags()).toEqual([]);
  });

  it('allows a removed tag to be added again', async () => {
    const { user } = setup({ tags: ['Remote'] });
    await user.click(screen.getByRole('button', { name: /remove tag remote/i }));
    await user.type(tagInput(), 'Remote{Enter}');

    expect(renderedTags()).toEqual(['Remote']);
  });
});

describe('tags at submission', () => {
  it('does not silently lose a tag left pending in the input', async () => {
    // The most likely way to lose data here: type a tag, press Save without
    // pressing Enter first.
    const { onSave, user } = setup();
    await fillRequired(user);
    await user.type(tagInput(), 'Remote{Enter}');
    await user.type(tagInput(), 'Unconfirmed');

    await user.click(screen.getByRole('button', { name: /save application/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].tags).toEqual(['Remote', 'Unconfirmed']);
  });

  it('does not duplicate a pending tag that already exists', async () => {
    const { onSave, user } = setup();
    await fillRequired(user);
    await user.type(tagInput(), 'Remote{Enter}');
    await user.type(tagInput(), 'remote');

    await user.click(screen.getByRole('button', { name: /save application/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].tags).toEqual(['Remote']);
  });

  it('submits normalised tag values', async () => {
    const { onSave, user } = setup();
    await fillRequired(user);
    await user.type(tagInput(), '  Dream    Job  {Enter}');

    await user.click(screen.getByRole('button', { name: /save application/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].tags).toEqual(['Dream Job']);
  });

  it('submits an empty array when no tags were added', async () => {
    const { onSave, user } = setup();
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: /save application/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].tags).toEqual([]);
  });
});

describe('long tag values', () => {
  const LONG = 'Extremely-Long-Tag-Value-That-Would-Otherwise-Stretch-The-Row-Far-Beyond-The-Viewport-Width';

  it('stores a long tag without truncating the data', async () => {
    const { onSave, user } = setup();
    await fillRequired(user);
    await user.type(tagInput(), `${LONG}{Enter}`);
    await user.click(screen.getByRole('button', { name: /save application/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    // The value is stored in full; only its presentation is constrained.
    expect(onSave.mock.calls[0][0].tags).toEqual([LONG]);
  });

  it('renders a long tag through the constrained chip markup', async () => {
    const { user } = setup();
    await user.type(tagInput(), `${LONG}{Enter}`);

    const chipText = document.querySelector('.chip-tag .chip-text');
    expect(chipText).not.toBeNull();
    expect(chipText?.textContent).toBe(LONG);

    // .chip caps width and .chip-text ellipsises; .chip-list wraps. jsdom does
    // not compute layout, so this asserts the mechanism is applied, not the
    // resulting pixels.
    const chip = chipText?.closest('.chip');
    expect(chip).not.toBeNull();
    expect(chip?.parentElement?.className).toContain('chip-list');
  });
});
