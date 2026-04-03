import {
    ClockifyTimeEntry,
    ClockifyCreateTimeEntry,
    ClockifyUser,
    Config,
} from '../types/index.js';

export class ClockifyService {
    private readonly baseUrl = 'https://api.clockify.me/api/v1';
    private readonly apiKey: string;
    private readonly workspaceId: string;

    constructor(private readonly config: Config) {
        this.apiKey = config.clockify.apiKey;
        this.workspaceId = config.clockify.workspaceId;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'X-Api-Key': this.apiKey,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(
                `Clockify API error: ${response.status} ${response.statusText} - ${errorBody}`
            );
        }

        if (response.status === 204) {
            return null as T;
        }

        return response.json() as Promise<T>;
    }

    async getUserByEmail(email: string): Promise<ClockifyUser | null> {
        const users = await this.request<ClockifyUser[]>(
            `/workspaces/${this.workspaceId}/users`
        );
        return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
    }

    async createTimeEntry(
        userId: string,
        entry: ClockifyCreateTimeEntry
    ): Promise<ClockifyTimeEntry> {
        return this.request<ClockifyTimeEntry>(
            `/workspaces/${this.workspaceId}/user/${userId}/time-entries`,
            {
                method: 'POST',
                body: JSON.stringify(entry),
            }
        );
    }

    async updateTimeEntry(
        _userId: string,
        timeEntryId: string,
        entry: ClockifyCreateTimeEntry
    ): Promise<ClockifyTimeEntry> {
        return this.request<ClockifyTimeEntry>(
            `/workspaces/${this.workspaceId}/time-entries/${timeEntryId}`,
            {
                method: 'PUT',
                body: JSON.stringify(entry),
            }
        );
    }

    async deleteTimeEntry(timeEntryId: string): Promise<void> {
        await this.request<void>(
            `/workspaces/${this.workspaceId}/time-entries/${timeEntryId}`,
            {
                method: 'DELETE',
            }
        );
    }

    async getTimeEntry(timeEntryId: string): Promise<ClockifyTimeEntry | null> {
        try {
            return await this.request<ClockifyTimeEntry>(
                `/workspaces/${this.workspaceId}/time-entries/${timeEntryId}`
            );
        } catch {
            return null;
        }
    }

    /**
     * Gets project ID by project name from config.
     * Returns null if project not found.
     */
    getProjectIdByName(projectName: string): string | null {
        const normalizedName = projectName.toLowerCase();
        return this.config.clockify.projects[normalizedName] ?? null;
    }

    /**
     * Gets all configured project names.
     */
    getConfiguredProjects(): string[] {
        return Object.keys(this.config.clockify.projects);
    }
}
