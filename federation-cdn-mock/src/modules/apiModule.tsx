import React from 'react';
import { useScalprum } from '@scalprum/react-core';
import { Box } from '@mui/material';

export const ApiConsumer = () => {
    const { api } = useScalprum();
    return <Box>API consumer isBeta: {`${api?.chrome.isBeta()}`}</Box>;
}

export const ApiChanger = () => {
    const { api } = useScalprum();
    return <div>API changer: <button onClick={() => api?.chrome.setIsBeta((prev) => !prev)}>Toggle isBeta</button></div>;
}
