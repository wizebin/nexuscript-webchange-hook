import { wrapHook } from 'nexusdk';
import { fetch } from 'node-fetch';
import { getTypeString, keys, deepEq } from 'objer';

export default wrapHook(async (properties, messages) => {
  const { trigger } = messages;
  const { url, method = 'GET', body, headers, status_changes = true, body_changes = true, header_changes = false, interval = 60000 } = properties;
  let currentBody;
  let currentStatus;
  let currentHeaders;

  const endMethod = method || 'GET';

  const options = {
    method: endMethod,
  };
  if (headers) {
    options.headers = headers;
  }
  if (body && endMethod.toLowerCase() !== 'get') {
    options.body = body;
  }

  const intervalHandle = setInterval(() => {
    fetch(url, options).then(async result => {
      const textResults = await results.text();
      const headerResults = resuts.headers.raw();

      const statusChanged = status_changes && currentStatus !== results.status;
      const bodyChanged = body_changes && currentBody !== textResults;
      const headersChanged = header_changes && !deepEq(currentHeaders, result.headers);

      if (currentBody !== undefined && (statusChanged || bodyChanged || headersChanged)) {
        trigger({ url, method, status: results.status, body: textResults, headers: headerResults })
      }

      currentBody = textResults;
      currentStatus = results.status;
      currentHeaders = headerResults;
    }).catch(err => {
      console.error(err);
    }) ;
  }, interval);
});

