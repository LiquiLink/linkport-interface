# Next.js LinkPort Frontend

This project is a frontend application built with Next.js, Tailwind CSS, and Wagmi for interacting with the LinkPort smart contracts. It provides a user-friendly interface for managing assets, liquidity pools, and user portfolios.

## Project Structure

```
nextjs-linkport-frontend
├── public
│   └── favicon.ico
├── src
│   ├── components
│   │   ├── ConnectWalletButton.tsx
│   │   ├── Layout.tsx
│   │   └── Navigation.tsx
│   ├── pages
│   │   ├── _app.tsx
│   │   ├── index.tsx
│   │   ├── assets.tsx
│   │   ├── pools.tsx
│   │   ├── portfolio.tsx
│   │   └── history.tsx
│   ├── styles
│   │   └── globals.css
│   └── utils
│       └── wagmiClient.ts
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── README.md
```

## Features

- **Connect Wallet**: Users can connect their Ethereum wallets to interact with the application.
- **Assets Management**: Users can loan and repay assets through the assets page.
- **Liquidity Pools**: Users can deposit and withdraw from liquidity pools.
- **Portfolio Overview**: Users can view their current portfolio state, including active loans and deposits.
- **Transaction History**: Users can track their past transactions and interactions with the smart contracts.

## Getting Started

To get started with the project, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd nextjs-linkport-frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:3000` to view the application.

## Technologies Used

- **Next.js**: A React framework for building server-rendered applications.
- **Tailwind CSS**: A utility-first CSS framework for styling.
- **Wagmi**: A React Hooks library for Ethereum that simplifies blockchain interactions.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.