import { wrapHook } from 'nexusdk';
import fetch from 'node-fetch';
import { getTypeString, keys, deepEq, set, get } from 'objer';
import { Parser as HtmlParser } from 'htmlparser2';

function parseHtml(text, { white_list }) {
  const result = [];
  let current = [];
  const { attribute_changes, text_changes } = white_list;
  const parser = new HtmlParser({
    onopentag: (name, attributes) => {
      const nextIndex = get(result, current).length + 1;
      current = current.concat(['children', nextIndex]);
      if (attribute_changes) {
        set(result, current.concat('attributes'), attributes);
      }
      set(result, current.concat('tag'), name);
    },
    ontext: (text) => {
      if (text_changes) {
        const nextIndex = get(result, current).length + 1;
        set(result, current.concat('children', nextIndex, 'text'), text);
      }
    },
    onclosetag: (text) => {
      if (text && text_changes) {
        const nextIndex = get(result, current).length + 1;
        set(result, current.concat('children', nextIndex, 'text'), text);
      }
      current.pop();
      current.pop();
    },
  });
  return result;
}

const encodingFuncs = {
  json: JSON.parse,
  html: parseHtml,
};

export function getDecoded(text, encoding, white_list) {
  const func = encodingFuncs[encoding];
  if (func) {
    return func(text, { white_list });
  }
  return text;
}

export default wrapHook(async (properties, messages) => {
  const { trigger } = messages;
  const { url, encoding = 'website', attribute_changes = false, text_changes = true, method = 'GET', body, headers, status_changes = true, body_changes = true, header_changes = false, interval = 60000 } = properties;
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
    fetch(url, options).then(async results => {
      const textResults = await results.text();
      const bodyResults = getDecoded(textResults, encoding, { attribute_changes, text_changes });
      const headerResults = results.headers.raw();

      const statusChanged = status_changes && currentStatus !== results.status;
      const bodyChanged = body_changes && deepEq(currentBody, bodyResults);
      const headersChanged = header_changes && !deepEq(currentHeaders, results.headers);

      if (currentBody !== undefined && (statusChanged || bodyChanged || headersChanged)) {
        trigger({ url, method, status: results.status, body: bodyResults, headers: headerResults, statusChanged, bodyChanged, headersChanged })
      }

      currentBody = bodyResults;
      currentStatus = results.status;
      currentHeaders = headerResults;
    }).catch(err => {
      console.error(err);
    }) ;
  }, interval);
});

