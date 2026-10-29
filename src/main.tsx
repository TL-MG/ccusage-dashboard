import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import 'antd/dist/reset.css';
import App from './App';
import './styles.css';

dayjs.locale('zh-cn');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#5b5bd6',
          colorInfo: '#5b5bd6',
          colorText: '#172033',
          colorTextSecondary: '#697386',
          borderRadius: 10,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
        },
        components: {
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#667085',
            rowHoverBg: '#f7f7ff',
          },
          Segmented: {
            itemSelectedBg: '#ffffff',
            trackBg: '#f1f3f8',
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
