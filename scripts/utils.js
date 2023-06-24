async function placeBet(name, signer, guessPrice, betAmount, implementaionContract) {
    const tx = await implementaionContract.connect(signer).placeBet(guessPrice, {
        value: ethers.utils.parseEther(betAmount),
    });
    console.log(`Account${name} has placed bet, guess price: ${guessPrice}`);
    const receipt = await tx.wait();
    return +getTokenId(receipt);
}

const getTokenId = (receipt) => {
    const { events } = receipt;
    const betPlacedEvent = events[events.length - 1];
    return betPlacedEvent?.args?.ticketId?.toString();
};

const getImplementationAddress = (receipt) => {
    const { events } = receipt;
    const ImplementationCreated = events[events.length - 1];
    return ImplementationCreated?.args?.implementationAddress;
};

const getProxyAddress = (receipt) => {
    const { events } = receipt;
    const ProxyCreated = events[events.length - 1];
    return ProxyCreated?.args?.proxy;
};

async function withdraw(name, account, implementaionContract, ticketId) {
    console.log(`Account${name} is withdrawing`);
    console.log({ ticketId, typeof: typeof ticketId });
    await implementaionContract.connect(account).withdrawFunds(ticketId);
    console.log(`Account${name} has withdrawn`);
    console.log("\n");
}

module.exports = { placeBet, getTokenId, getImplementationAddress, withdraw, getProxyAddress };
