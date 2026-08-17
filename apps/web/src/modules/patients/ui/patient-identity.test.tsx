import { render, screen, waitFor } from '@testing-library/react';
import type { PatientResponse } from '@/shared/api/generated/models/patientResponse';
import { PatientIdentity } from './patient-identity';

const patient: PatientResponse = {
  age: 34,
  createdAt: '2026-08-17T08:00:00.000Z',
  firstName: '👩🏽‍⚕️lise',
  hasPhoto: true,
  id: '00000000-0000-4000-8000-000000000001',
  lastName: 'Éclair',
};
const NativeImage = window.Image;

describe(PatientIdentity.name, () => {
  let imageOutcome: 'error' | 'loaded';

  beforeEach(() => {
    imageOutcome = 'loaded';
    Object.defineProperty(window, 'Image', {
      configurable: true,
      value: class {
        complete = false;
        naturalWidth = 0;
        onerror: (() => void) | null = null;
        onload: (() => void) | null = null;

        set src(_value: string) {
          queueMicrotask(() =>
            imageOutcome === 'loaded' ? this.onload?.() : this.onerror?.(),
          );
        }
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'Image', {
      configurable: true,
      value: NativeImage,
    });
  });

  it('shows the full name with the default patient avatar', () => {
    const { container } = render(
      <PatientIdentity patient={{ ...patient, hasPhoto: false }} />,
    );

    expect(screen.getByText('👩🏽‍⚕️lise Éclair')).toBeVisible();
    expect(
      container.querySelector('[data-slot="avatar-fallback"] svg'),
    ).toBeVisible();
  });

  it('uses the authenticated current-photo route with a decorative image', async () => {
    const { container } = render(<PatientIdentity patient={patient} />);

    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      `http://localhost:3000/api/patients/${patient.id}/photo`,
    );
    expect(container.querySelector('img')).toHaveAttribute(
      'crossorigin',
      'use-credentials',
    );
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
    expect(screen.getByText('👩🏽‍⚕️lise Éclair')).toBeVisible();
  });

  it('falls back to the default avatar when current photo rendering fails', async () => {
    imageOutcome = 'error';
    const { container } = render(<PatientIdentity patient={patient} />);

    await waitFor(() =>
      expect(
        container.querySelector('[data-slot="avatar-fallback"] svg'),
      ).toBeVisible(),
    );
    expect(screen.getByText('👩🏽‍⚕️lise Éclair')).toBeVisible();
  });
});
