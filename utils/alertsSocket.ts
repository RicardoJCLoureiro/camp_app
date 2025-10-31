// import * as signalR from '@microsoft/signalr';

// // NEXT_PUBLIC_API_BASE_URL: https://localhost:7028/api
// const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
// const hubBase = apiBase.replace(/\/api\/?$/i, '') + '/hubs/alerts';

// export function createAlertsConnection() {
//   const conn = new signalR.HubConnectionBuilder()
//     .withUrl(hubBase, {
//       withCredentials: true, // cookie auth
//       transport:
//         signalR.HttpTransportType.WebSockets |
//         signalR.HttpTransportType.ServerSentEvents |
//         signalR.HttpTransportType.LongPolling,
//     })
//     .withAutomaticReconnect({
//       nextRetryDelayInMilliseconds: (ctx) => {
//         if (ctx.previousRetryCount < 5) return 1000 * (ctx.previousRetryCount + 1);
//         return 10000;
//       },
//     })
//     .build();

//   return conn;
// }
