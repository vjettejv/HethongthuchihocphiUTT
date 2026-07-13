import http from 'k6/http';
import { check, sleep } from 'k6';

// Trùng với backend (server.js): PORT mặc định 8080, prefix API là /api k6 run loadtest.js
// Khoản phí (staff): k6 run -e path=/api/fees -e token=<jwt_staff> loadtest.js
const baseUrl = __ENV.baseUrl || 'http://localhost:8080';
const path = __ENV.path || '/';

export let options = {
    stages: [
        { duration: '5s', target: 50 },
        { duration: '10s', target: 200 },
        { duration: '5s', target: 0 },
    ],
};

export default function () {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${baseUrl}${normalizedPath}`;
    const params =
        normalizedPath.startsWith('/api/') && __ENV.token
            ? { headers: { Authorization: `Bearer ${__ENV.token}` } }
            : {};

    let res = http.get(url, params);

    check(res, {
        'Trạng thái là 200': (r) => r.status === 200,
        'Thời gian phản hồi < 800ms': (r) => r.timings.duration < 800,
    });

    sleep(1);
}
