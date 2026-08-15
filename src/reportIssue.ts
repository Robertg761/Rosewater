import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const REPORT_TITLE_MAX_LENGTH = 120;
export const REPORT_DESCRIPTION_MAX_LENGTH = 5000;

const REPORT_ISSUE_URL = 'https://rosewater-report-api.vercel.app/api/report-issue';
const REQUEST_TIMEOUT_MS = 15_000;

export interface IssueReport {
  title: string;
  description: string;
}

export interface SubmittedIssue {
  number: number;
  url: string;
}

interface ReportIssueResponse {
  issue?: {
    number?: unknown;
    url?: unknown;
  };
  error?: unknown;
}

export class ReportIssueError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null
  ) {
    super(message);
    this.name = 'ReportIssueError';
  }
}

function errorMessage(status: number, payload: ReportIssueResponse | null): string {
  if (status === 429) return 'Too many reports were sent from this network. Try again later.';
  if (status >= 500) return 'The report service is unavailable right now. Try again later.';
  if (typeof payload?.error === 'string' && payload.error.trim() !== '') return payload.error;
  return 'Rosewater could not send the report. Check your connection and try again.';
}

export async function submitIssueReport(report: IssueReport): Promise<SubmittedIssue> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(REPORT_ISSUE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: report.title.trim(),
        description: report.description.trim(),
        appVersion: Constants.expoConfig?.version ?? 'unknown',
        platform: Platform.OS,
        osVersion: String(Platform.Version),
      }),
      signal: controller.signal,
    });

    let payload: ReportIssueResponse | null = null;
    try {
      payload = (await response.json()) as ReportIssueResponse;
    } catch {
      // A non-JSON response still gets the status-specific message below.
    }

    if (!response.ok) {
      throw new ReportIssueError(errorMessage(response.status, payload), response.status);
    }

    const number = payload?.issue?.number;
    const url = payload?.issue?.url;
    if (typeof number !== 'number' || !Number.isInteger(number) || typeof url !== 'string') {
      throw new ReportIssueError('GitHub created the report, but Rosewater could not read its link.');
    }

    return { number, url };
  } catch (error) {
    if (error instanceof ReportIssueError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ReportIssueError(
        'The report took too long to send. Check your connection and try again.'
      );
    }
    throw new ReportIssueError(
      'Rosewater could not send the report. Check your connection and try again.'
    );
  } finally {
    clearTimeout(timeout);
  }
}
