/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/yapdotfun.json`.
 */
export type Yapdotfun = {
  "address": "YappeTaxE8txMK7LwUuFBswCvnktievP7f3U5c5tZwB",
  "metadata": {
    "name": "yapdotfun",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "market",
          "docs": [
            "The main market account that stores core market information",
            "PDA derived from \"market\", the market description, and the creator's public key"
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
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "description"
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "marketMetadata",
          "docs": [
            "The market metadata account that stores financial information about the market",
            "PDA derived from \"market-metadata\", the market description, and the creator's public key"
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
                  45,
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
                "kind": "arg",
                "path": "description"
              },
              {
                "kind": "account",
                "path": "signer"
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
    }
  ],
  "types": [
    {
      "name": "market",
      "docs": [
        "Data Account for storing Market data"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "description",
            "docs": [
              "Short description of the market question (limited to 4 characters)"
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
              "Final outcome of the market (true for Yes, false for No)"
            ],
            "type": "bool"
          },
          {
            "name": "initializer",
            "docs": [
              "Public key of the account that created this market"
            ],
            "type": "pubkey"
          },
          {
            "name": "metadata",
            "docs": [
              "Public key pointing to the associated MarketMetadata account"
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "marketMetadata",
      "docs": [
        "Data Account for storing Market metadata"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "totalYesAssets",
            "docs": [
              "Total SOL invested in YES positions"
            ],
            "type": "u64"
          },
          {
            "name": "totalNoAssets",
            "docs": [
              "Total SOL invested in NO positions"
            ],
            "type": "u64"
          },
          {
            "name": "totalYesShares",
            "docs": [
              "Total number of YES shares issued"
            ],
            "type": "u8"
          },
          {
            "name": "totalNoShares",
            "docs": [
              "Total number of NO shares issued"
            ],
            "type": "u8"
          },
          {
            "name": "totalRewards",
            "docs": [
              "Total SOL in the rewards pool to be distributed to winners"
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
    }
  ]
};
