import { InfisicalSDK } from '@infisical/sdk';
import { Logger } from '@nestjs/common';

const logger = new Logger('Infisical');

/**
 * 动态从 Infisical 云端拉取密钥并注入到 process.env
 */
export async function loadInfisicalSecrets() {
  const clientId = process.env.INFISICAL_CLIENT_ID;
  const clientSecret = process.env.INFISICAL_CLIENT_SECRET;
  const projectId = process.env.INFISICAL_PROJECT_ID;
  const serviceToken = process.env.INFISICAL_TOKEN;
  const siteUrl = process.env.INFISICAL_SITE_URL || 'https://app.infisical.com';
  const environment =
    process.env.INFISICAL_ENV ||
    (process.env.NODE_ENV === 'production' ? 'prod' : 'dev');

  // 如果配置了 Universal Auth 凭证
  if (clientId && clientSecret && projectId) {
    try {
      logger.log(`正在连接 Infisical (${siteUrl}) 拉取 [${environment}] 环境配置...`);

      const sdk = new InfisicalSDK({ siteUrl });
      await sdk.auth().universalAuth.login({
        clientId,
        clientSecret,
      });

      const response = await sdk.secrets().listSecrets({
        environment,
        projectId,
        attachToProcessEnv: true,
      });

      if (response?.secrets) {
        for (const secret of response.secrets) {
          process.env[secret.secretKey] = secret.secretValue;
        }
        logger.log(`成功从 Infisical 同步 ${response.secrets.length} 个配置变量！`);
      }
      return;
    } catch (error: any) {
      logger.error(`从 Infisical 同步配置失败: ${error?.message || error}`);
      logger.warn('将回退使用本地已有的 process.env 变量运行。');
    }
  } else if (serviceToken && projectId) {
    // 兼容 Service Token 模式
    try {
      logger.log(`检测到 INFISICAL_TOKEN，正在同步密钥...`);
      const sdk = new InfisicalSDK({ siteUrl });
      sdk.auth().accessToken(serviceToken);

      const response = await sdk.secrets().listSecrets({
        environment,
        projectId,
        attachToProcessEnv: true,
      });

      if (response?.secrets) {
        for (const secret of response.secrets) {
          process.env[secret.secretKey] = secret.secretValue;
        }
        logger.log(`成功从 Infisical 同步 ${response.secrets.length} 个配置变量！`);
      }
      return;
    } catch (error: any) {
      logger.error(`Infisical Token 同步失败: ${error?.message || error}`);
    }
  } else {
    logger.log('未检测到 Infisical 连接凭据，使用本地 .env 环境变量启动。');
  }
}
