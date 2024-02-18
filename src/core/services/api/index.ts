import { AxiosRequestHeaders } from 'axios';
import { serviceDelete, serviceGet, servicePatch, servicePost } from './intialize';

// const REQUEST_UNIQUE_ID_KEY = 'X-Request-UUID';
// const GLOBAL_BOTTOM_SHEET_DATA_KEY = 'global_bottom_sheet';
// const TIMEOUT = 'ECONNABORTED';

// const getToken = () => {
//   return store?.getState()?.user?.token;
// };

// TODO: refactor deep links
// const deepLinkHandler = (data: any) => {
//   const url = data?.url;
//   if (url) redirect(url);
// };

// const inTrackResponseHandler = (response: any) => {
//   const { eventName, eventData, userId } = response?.data?.data?.in_track || {};

//   if (eventName) {
//     inTrackSendEvent({
//       eventName,
//       eventData: eventData || {},
//       userId
//     });
//   }
// };

// const dataLayerResponseHandler = (response: any) => {
//   if (response?.data?.data?.enhance_ecommerce && isProduction) {
//     pushToDataLayer(response?.data?.data?.enhance_ecommerce);
//   }
// };

const messageHandler = (response: any) => {
  //   const message = response?.data?.data?.message;
  //   message &&
  //     toast(message, {
  //       closeButton: true
  //     });
  // store.dispatch(
  //   addAlertAction({
  //     text: message,
  //     closeText: 'متوجه شدم'
  //   })
  // );
};
// const timeoutHandler = (error: string) => {
//   if (error === TIMEOUT) {
//     sendLog(TIMEOUT_ERROR);
//   }
// };
interface ApiOptions {
  headers?: (AxiosRequestHeaders & { Authorization?: string }) | {};
  isPublic?: boolean;
  [key: string]: any;
}
function get<T = any>(url: string, params = {}, { headers = {}, isPublic, ...options }: ApiOptions = {}): Promise<T> {
  const completeHeaders = {
    ...headers
  };
  // TODO: set csrf token
  // if (!isPublic) completeHeaders.Authorization = getToken();
  return new Promise(function (resolve, reject) {
    serviceGet(url, { ...options, params: { ...params }, headers: completeHeaders })
      .then(function (response) {
        // deepLinkHandler(response?.data?.url);

        if (response?.status === 200) {
          // const globalBottomSheetData = response?.data?.data?.[GLOBAL_BOTTOM_SHEET_DATA_KEY];

          // if (globalBottomSheetData) {
          //   store.dispatch(openGlobalBottomSheetAction(transformGlobalBottomSheet(globalBottomSheetData)));
          // }

          // messageHandler(response);
          // dataLayerResponseHandler(response);
          // inTrackResponseHandler(response);
          const responseData = response?.data?.data;

          resolve(responseData);
        } else reject(response);

        // if (response?.status === 404) Router.push(URLS.ERROR_404);
      })
      .catch(function (error) {
        reject(error);
      });
  });
}

function post<T = any>(
  url: string,
  data = {},
  { headers = {}, isPublic, isLocationBased, ...options }: ApiOptions = {}
): Promise<T> {
  const completeHeaders = {
    ...headers
  };
  // Note: This because of handling FormData objects
  // TODO: Find a better way so we can have formData and location data together if it is needed
  const completeData = isLocationBased ? { ...data, ...location } : data;

  // TODO: set csrf token
  // if (!isPublic) completeHeaders.Authorization = getToken();
  return new Promise(function (resolve, reject) {
    servicePost(url, completeData, { ...options, headers: completeHeaders })
      .then(function (response) {
        // if (url !== LOGIN_EP) {
        //   //FIXME: this is a temporary solution for new register navigation
        //   // the backend shouldn't send deep link for login endpoint
        //   deepLinkHandler(response?.data?.url);
        // }
        if (response?.data?.status === 200) {
          messageHandler(response);
          // dataLayerResponseHandler(response);
          // inTrackResponseHandler(response);
          resolve(response?.data?.data);
        } else reject(response);
      })
      .catch(function (error) {
        // deepLinkHandler(error?.data?.url);
        reject(error);
      });
  });
}

function patch<T = any>(
  url: string,
  data = {},
  { headers = {}, isPublic, isLocationBased, ...options }: ApiOptions = {}
): Promise<T> {
  const completeHeaders = {
    ...headers
  };
  // Note: This because of handling FormData objects
  // TODO: Find a better way so we can have formData and location data together if it is needed
  const completeData = isLocationBased ? { ...data, ...location } : data;

  // TODO: set csrf token
  // if (!isPublic) completeHeaders.Authorization = getToken();
  return new Promise(function (resolve, reject) {
    servicePatch(url, completeData, { ...options, headers: completeHeaders })
      .then(function (response) {
        // if (url !== LOGIN_EP) {
        //   //FIXME: this is a temporary solution for new register navigation
        //   // the backend shouldn't send deep link for login endpoint
        //   deepLinkHandler(response?.data?.url);
        // }
        if (response?.data?.status === 200) {
          messageHandler(response);
          // dataLayerResponseHandler(response);
          // inTrackResponseHandler(response);
          resolve(response?.data?.data);
        } else reject(response);
      })
      .catch(function (error) {
        // deepLinkHandler(error?.data?.url);
        reject(error);
      });
  });
}

function del<T = any>(url: string, params = {}, { headers = {}, isPublic, ...options }: ApiOptions = {}): Promise<T> {
  const completeHeaders = {
    ...headers
  };
  // TODO: set csrf token
  // if (!isPublic) completeHeaders.Authorization = getToken();
  return new Promise(function (resolve, reject) {
    serviceDelete(url, { ...options, params: { ...params }, headers: completeHeaders })
      .then(function (response) {
        // deepLinkHandler(response?.data?.url);

        if (response?.status === 200) {
          // const globalBottomSheetData = response?.data?.data?.[GLOBAL_BOTTOM_SHEET_DATA_KEY];

          // if (globalBottomSheetData) {
          //   store.dispatch(openGlobalBottomSheetAction(transformGlobalBottomSheet(globalBottomSheetData)));
          // }

          // messageHandler(response);
          // dataLayerResponseHandler(response);
          // inTrackResponseHandler(response);
          const responseData = response?.data?.data;

          resolve(responseData);
        } else reject(response);

        // if (response?.status === 404) Router.push(URLS.ERROR_404);
      })
      .catch(function (error) {
        reject(error);
      });
  });
}

export default {
  get,
  post,
  del,
  patch
};
