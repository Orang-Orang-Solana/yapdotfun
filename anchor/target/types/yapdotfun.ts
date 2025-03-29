/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/yapdotfun.json`.
 */
export type Yapdotfun = {
  "address": "4tsFN1tukaM3Jm4x9EPpAKCWQXibwaCzwmsvmuodGK5D",
  "metadata": {
    "name": "yapdotfun",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "buy",
      "discriminator": [
        102,
        6,
        61,
        18,
        1,
        218,
        235,
        234
      ],
      "accounts": [
        {
          "name": "market",
          "docs": [
            "The market account that will be updated"
          ],
          "writable": true
        },
        {
          "name": "marketMetadata",
          "docs": [
            "The market metadata account that tracks voting statistics",
            "This PDA is derived from the market account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "marketVoter",
          "docs": [
            "A new account that will be initialized to track this user's vote",
            "This PDA is derived from the voter's pubkey and the market"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  111,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "signer",
          "docs": [
            "The user who is voting and paying for the transaction"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "The system program, used for transferring SOL"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bet",
          "type": "bool"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeMarket",
      "discriminator": [
        35,
        35,
        189,
        193,
        155,
        48,
        170,
        203
      ],
      "accounts": [
        {
          "name": "market",
          "docs": [
            "The main market account that stores core market information",
            "PDA derived from \"market\" and the hash of the market description"
          ],
          "writable": true
        },
        {
          "name": "marketMetadata",
          "docs": [
            "The market metadata account that stores financial information about the market",
            "PDA derived from \"market_metadata\" and the market account's public key"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "signer",
          "docs": [
            "The account that is initializing the market and paying for account creation"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "The Solana System Program, required for creating new accounts"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "description",
          "type": "string"
        }
      ]
    },
    {
      "name": "sell",
      "discriminator": [
        51,
        230,
        133,
        164,
        1,
        127,
        131,
        173
      ],
      "accounts": [
        {
          "name": "market",
          "docs": [
            "The market account that will be updated"
          ],
          "writable": true
        },
        {
          "name": "marketMetadata",
          "docs": [
            "The market metadata account that tracks voting statistics",
            "This PDA is derived from the market account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "marketVoter",
          "docs": [
            "The market voter account that tracks the user's vote",
            "This PDA is derived from the voter's pubkey and the market"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  118,
                  111,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "signer",
          "docs": [
            "The user who is selling their shares"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "The system program, used for transferring SOL"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bet",
          "type": "bool"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "market",
      "discriminator": [
        219,
        190,
        213,
        55,
        0,
        227,
        198,
        154
      ]
    },
    {
      "name": "marketMetadata",
      "discriminator": [
        12,
        16,
        109,
        58,
        31,
        252,
        133,
        8
      ]
    },
    {
      "name": "marketVoter",
      "discriminator": [
        246,
        139,
        153,
        131,
        204,
        223,
        234,
        192
      ]
    }
  ],
  "events": [
    {
      "name": "marketClosedEvent",
      "discriminator": [
        64,
        193,
        117,
        138,
        19,
        11,
        84,
        44
      ]
    },
    {
      "name": "marketInitializedEvent",
      "discriminator": [
        70,
        173,
        96,
        202,
        100,
        143,
        45,
        25
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "amountConstraintViolated",
      "msg": "Amount must be greater than 0"
    },
    {
      "code": 6001,
      "name": "marketClosed",
      "msg": "Market has been closed"
    },
    {
      "code": 6002,
      "name": "marketNotClosed",
      "msg": "Market is not closed"
    },
    {
      "code": 6003,
      "name": "marketDoesNotExist",
      "msg": "Market doesn't exist"
    },
    {
      "code": 6004,
      "name": "notEnoughShares",
      "msg": "Not enough shares"
    },
    {
      "code": 6005,
      "name": "notOracle",
      "msg": "Caller is not oracle"
    },
    {
      "code": 6006,
      "name": "noSharesToSell",
      "msg": "No shares to sell"
    }
  ],
  "types": [
    {
      "name": "market",
      "docs": [
        "Main account that stores core information about a prediction market"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "description",
            "docs": [
              "Description of the market question",
              "This is used as part of the PDA seed for the market account"
            ],
            "type": "string"
          },
          {
            "name": "status",
            "docs": [
              "Current status of the market (Open or Closed)"
            ],
            "type": {
              "defined": {
                "name": "marketStatus"
              }
            }
          },
          {
            "name": "answer",
            "docs": [
              "Final outcome of the market (true for Yes, false for No)",
              "This is set when the market is settled"
            ],
            "type": "bool"
          },
          {
            "name": "initializer",
            "docs": [
              "Public key of the account that created this market"
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "marketClosedEvent",
      "docs": [
        "Event emitted when a prediction market is closed",
        "",
        "This event is triggered when a market's status is changed from Open to Closed,",
        "indicating that it is no longer accepting bets and is ready for settlement."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "message",
            "docs": [
              "A human-readable message describing the event"
            ],
            "type": "string"
          },
          {
            "name": "marketId",
            "docs": [
              "The public key of the closed market account, as a string"
            ],
            "type": "string"
          },
          {
            "name": "marketMetadataId",
            "docs": [
              "The public key of the market's metadata account, as a string"
            ],
            "type": "string"
          },
          {
            "name": "initializer",
            "docs": [
              "The public key of the account that closed the market, as a string"
            ],
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "marketInitializedEvent",
      "docs": [
        "Event emitted when a new prediction market is initialized",
        "",
        "This event is triggered when the `initialize_market` instruction successfully",
        "creates a new market and its associated metadata account."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "message",
            "docs": [
              "A human-readable message describing the event"
            ],
            "type": "string"
          },
          {
            "name": "marketId",
            "docs": [
              "The public key of the newly created market account, as a string"
            ],
            "type": "string"
          },
          {
            "name": "marketMetadataId",
            "docs": [
              "The public key of the market metadata account, as a string"
            ],
            "type": "string"
          },
          {
            "name": "initializer",
            "docs": [
              "The public key of the account that initialized the market, as a string"
            ],
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "marketMetadata",
      "docs": [
        "Account that stores financial information about a prediction market",
        "PDA derived from \"market_metadata\" and the market account's public key"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "totalYesAssets",
            "docs": [
              "Total SOL invested in YES positions (in lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "totalNoAssets",
            "docs": [
              "Total SOL invested in NO positions (in lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "totalYesShares",
            "docs": [
              "Total number of YES shares issued to participants"
            ],
            "type": "u64"
          },
          {
            "name": "totalNoShares",
            "docs": [
              "Total number of NO shares issued to participants"
            ],
            "type": "u64"
          },
          {
            "name": "totalRewards",
            "docs": [
              "Total SOL in the rewards pool to be distributed to winners (in lamports)"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "marketStatus",
      "docs": [
        "Represents the current status of a prediction market"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "closed"
          }
        ]
      }
    },
    {
      "name": "marketVoter",
      "docs": [
        "Account that tracks a user's vote on a specific market",
        "PDA derived from \"market_voter\", the voter's public key, and the market account's public key"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "docs": [
              "Amount of SOL (in lamports) that the user has invested"
            ],
            "type": "u64"
          },
          {
            "name": "vote",
            "docs": [
              "The user's vote (true = YES, false = NO)"
            ],
            "type": "bool"
          }
        ]
      }
    }
  ]
};
