import React from 'react';
import { useScalprum } from '@scalprum/react-core';

export const ApiConsumer = () => {
    const { api } = useScalprum();
    return <div>API consumer isBeta: {`${api.chrome.isBeta()}`}</div>;
}

export const ApiChanger = () => {
    const { api } = useScalprum();
    return <div>API changer: <button onClick={() => api.chrome.setIsBeta((prev) => !prev)}>Toggle isBeta</button></div>;
}
