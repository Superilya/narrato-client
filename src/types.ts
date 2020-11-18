export type List<T> = {
    count: number,
    next: number,
    previous: number,
    results: Array<T>
}

export type Preject = {
    uuid: string;
    label: string;
    created_at: string;
}

export type Component = {
    label: string;
    content: string;
}

export type Session = {
    current: {
        uuid: string;
        component: Component,
        is_finished: boolean;
        created_at: string | null;
        finished_at: string | null
    },
    choices: Array<{
        uuid: string;
        label: string;
    }>
}