import mailchimp from '@mailchimp/mailchimp_marketing';
import { config } from '../config';
import { logger } from './logger';

if (config.mailchimpApiKey && config.mailchimpServerPrefix) {
  mailchimp.setConfig({
    apiKey: config.mailchimpApiKey,
    server: config.mailchimpServerPrefix,
  });
}

export async function addToMailchimpList(email: string, mergeFields?: Record<string, string>): Promise<void> {
  if (!config.mailchimpApiKey || !config.mailchimpListId) {
    logger.warn('Mailchimp not configured, skipping email addition');
    return;
  }

  try {
    await mailchimp.lists.addListMember(config.mailchimpListId, {
      email_address: email,
      status: 'subscribed',
      merge_fields: mergeFields,
    });
    
    logger.info(`Added ${email} to Mailchimp list`);
  } catch (error: unknown) {
    // Handle member already exists error
    if (error && typeof error === 'object' && 'response' in error) {
      const response = error.response as { body?: { title?: string } };
      if (response.body?.title === 'Member Exists') {
        logger.debug(`Email ${email} already exists in Mailchimp list`);
        return;
      }
    }
    
    logger.error('Failed to add email to Mailchimp:', error);
    throw error;
  }
}