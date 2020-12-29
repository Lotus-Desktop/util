import StateManager from "../state";

export interface MsgState {
    functionId: number,
    functions: { called: boolean, fId: number, cb: ((data?: any) => void) }[],
    requests: { fId: number, data: any, name: string }[],
    requestHandlers: { [name: string]: (data: any) => any },
    procName: string,
    msgTarget: <T>(msg: { fId: number, data: T, name: string }) => void,
    incomingMsg: { fId: number, data: any, name: string },
    binder: any
}

export type channelFn = <T>(
    name: string,
    data: any) => Promise<T>;

export default function (stateManager: StateManager<MsgState>): channelFn {
    stateManager.on('requestInfo', function (state: MsgState) {
        if (state.requests) {
            const fn = state.requests[state.requests.length - 1];

            const send = msg => state.msgTarget<MsgState>(msg);

            if (state.requestHandlers && state.requestHandlers[fn.name])
                if (state.msgTarget) {
                    const response = state.requestHandlers[fn.name].bind(state.binder ?? stateManager)(fn.data);
                    if (response instanceof Promise)
                        response.then(response => send(response));
                    else
                        send(response);
                }
        }
    });

    stateManager.on('message', function (prev: MsgState) {
        const data: { fId: number, data: any, name?: string } = prev.incomingMsg;

        if ('fId' in data) {
            const state: MsgState = stateManager.setState();

            if (state.functions?.find(i => i.fId === data.fId)) {
                if (state.functions)
                    for (const f of state.functions)
                        if (f.fId === data.fId) {
                            f.called = true;
                            if (data.data)
                                f.cb(data.data);
                            else
                                f.cb();
                        }
            } else {
                stateManager.dispatch('requestInfo', function (prev: MsgState): Partial<MsgState> {
                    if ('name' in data && data.name)
                        return {
                            functionId: Math.max(prev.functionId || 0, data.fId) + 1,
                            requests: [...prev.requests, {
                                fId: data.fId,
                                data: data.data,
                                name: data.name
                            }]
                        }
                    return {}
                });
            }
        }
    });

    return function requestInfo<T>(
        name: string,
        data: any): Promise<T> {
        return new Promise(function (resolve) {
            const onReturn = function (data: T) {
                resolve(data);
            };

            const state = stateManager.setState();

            if (state.msgTarget)
                state.msgTarget({
                    fId: state.functionId || 0,
                    data,
                    name
                });

            stateManager.setState(prev => ({
                functionId: (prev.functionId || 0) + 1,
                functions: [...prev.functions, {
                    called: false,
                    fId: state?.functionId || 0,
                    cb: (data: T) => onReturn(data)
                }]
            }));
        })
    }
}
