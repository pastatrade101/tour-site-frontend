import { env as publicEnv } from '$env/dynamic/public';

export const API_URL = publicEnv.PUBLIC_API_URL || 'http://localhost:5000/api';
