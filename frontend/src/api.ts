const API_URL = 'http://localhost:5000';


//T is the reply shape we expect  like api < { Users:user}
export async function api<T>(path: string,body?:unknown): Promise<T> {
    const response = await fetch (`${API_URL}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: body === undefined ? undefined :JSON.stringify(body),
    });

    const data = await response.json();

    if(!response.ok){
        const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(message ?? 'Something went wrong');
    }

    return data as T;   
}

export function errorText(error: unknown): string {
    return error instanceof Error ? error.message : 'Something went wrong';
}