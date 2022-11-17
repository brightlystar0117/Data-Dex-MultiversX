import React, { useEffect, useState } from 'react';
import { useGetAccountInfo } from '@elrondnetwork/dapp-core/hooks/account';
import { DataNftMarketContract } from '../Elrond/dataNftMarket';
import { useGetPendingTransactions } from '@elrondnetwork/dapp-core/hooks/transactions';
import { roundDown, hexZero,getTokenWantedRepresentation,getTokenImgSrc,tokenDecimals } from '../Elrond/tokenUtils.js';
import { getApi } from 'Elrond/api';

const Shop = () => {
  const { address } = useGetAccountInfo();
  const { hasPendingTransactions } = useGetPendingTransactions();
  const isLoggedIn = Boolean(address);
  const [tokensForSale, setTokensForSale] = useState<any[]>([]);
  const [amountOfTokens, setAmountOfTokens] = useState<any>({});
  const [numberOfPages, setNumberOfPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const contract = new DataNftMarketContract('ED');

  useEffect(() => {
    contract.getNumberOfOffers().then((nr:any)=>{
        setNumberOfPages(Math.ceil(nr/25));
    })
  }, [hasPendingTransactions]);

  useEffect(() => {
    contract.getOffers(0,25).then((offers:any)=>{
        setTokensForSale(offers);
        let amounts: any = {};
        offers.forEach((offer:any)=>amounts[offer.index] = 1);
        setAmountOfTokens(amounts);
  })}, [currentPage, hasPendingTransactions]);

  return (
    <div className='gallery-container'>
      <div className='gallery'>
        {tokensForSale.map((token, ind) => {
          console.log(amountOfTokens[token['index']]);
          console.log((token['want']['amount'] *
          amountOfTokens[token['index']]) /
          Math.pow(
            10,
            tokenDecimals(token['want']['identifier'])
          ) +
          ' ')
          return (
            <div
              key={token['index']}
              className={'nft-card m-3'}
              style={{ width: '18rem', margin: 'auto' }}
            >
              <img
                className={'card-img-top'}
                src={`${getApi('ED')}/nfts/${
                  token['have']['identifier']
                }-${hexZero(token['have']['nonce'])}/thumbnail`}
                alt='Data NFT'
              />
              <div className='card-body text-white d-flex flex-column justify-content-center align-items-center'>
                <div className=''>Supply: {token['quantity']}</div>
                <div className='mb-3 d-flex flex-row justify-content-between align-items-center'>
                  <span
                    className='minus d-flex flex-row justify-content-center'
                    onClick={() => {
                      if (amountOfTokens[token['index']] > 1) {
                        const amounts = { ...amountOfTokens };
                        amounts[token['index']] = amounts[token['index']] - 1;
                        setAmountOfTokens(amounts);
                      }
                    }}
                  >
                    <i className='fa fa-minus'></i>
                  </span>
                  <span className='amount'>
                    {amountOfTokens[token['index']]}
                  </span>
                  <span
                    className='plus d-flex flex-row justify-content-center'
                    onClick={() => {
                      if (
                        amountOfTokens[token['index']] < token['quantity'] &&
                        amountOfTokens[token['index']] < 2
                      ) {
                        const amounts = { ...amountOfTokens };
                        amounts[token['index']] = amounts[token['index']] + 1;
                        setAmountOfTokens(amounts);
                      }
                    }}
                  >
                    <i className='fa fa-plus'></i>
                  </span>
                </div>
                <div className='card-title font-egold '>
                  {(
                    token['have']['amount'] /
                    Math.pow(10, tokenDecimals(token['have']['identifier']))
                  ).toLocaleString() + ' '}{' '}
                  x{' '}
                  {getTokenWantedRepresentation(
                    token['have']['identifier'],
                    token['have']['nonce']
                  )}
                </div>
                <div>
                  Price:
                  {' ' +
                    token['want']['amount'] /
                      Math.pow(10, tokenDecimals(token['want']['identifier'])) +
                    ' '}
                  {getTokenWantedRepresentation(
                    token['want']['identifier'],
                    token['want']['nonce']
                  )}
                </div>
                <div>
                    <span
                      className={'btn connect'}
                      data-testid='loginBtn'
                      onClick={() => {
                        if (token['want']['identifier'] === 'EGLD') {
                          contract.sendAcceptOfferEgldTransaction(
                            token['index'],
                            token['want']['amount'],
                            amountOfTokens[token['index']],
                            address
                          );
                        } else {
                          if (token['want']['nonce'] === 0) {
                            contract.sendAcceptOfferEsdtTransaction(
                              token['index'],
                              token['want']['amount'],
                              token['want']['identifier'],
                              amountOfTokens[token['index']],
                              address
                            );
                          } else {
                            contract.sendAcceptOfferNftEsdtTransaction(
                              token['index'],
                              token['want']['amount'],
                              token['want']['identifier'],
                              token['want']['nonce'],
                              amountOfTokens[token['index']],
                              address
                            );
                          }
                        }
                      }}
                    >
                      Buy for{' '}
                      {(token['want']['amount'] *
                        amountOfTokens[token['index']]) /
                        Math.pow(
                          10,
                          tokenDecimals(token['want']['identifier'])
                        ) +
                        ' '}
                      {getTokenWantedRepresentation(
                        token['want']['identifier'],
                        token['want']['nonce']
                      )}
                    </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Shop;