import { useState } from 'react';

const AssetsPage = () => {
    const [loanAmount, setLoanAmount] = useState('');
    const [repayAmount, setRepayAmount] = useState('');

    const handleLoan = async (e) => {
        e.preventDefault();
        // Logic to handle loaning assets
    };

    const handleRepay = async (e) => {
        e.preventDefault();
        // Logic to handle repaying assets
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Assets</h1>
            <div className="mb-8">
                <h2 className="text-xl font-semibold">Loan Assets</h2>
                <form onSubmit={handleLoan} className="flex flex-col">
                    <input
                        type="text"
                        placeholder="Loan Amount"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(e.target.value)}
                        className="border p-2 mb-4"
                    />
                    <button type="submit" className="bg-blue-500 text-white p-2">
                        Loan
                    </button>
                </form>
            </div>
            <div>
                <h2 className="text-xl font-semibold">Repay Assets</h2>
                <form onSubmit={handleRepay} className="flex flex-col">
                    <input
                        type="text"
                        placeholder="Repay Amount"
                        value={repayAmount}
                        onChange={(e) => setRepayAmount(e.target.value)}
                        className="border p-2 mb-4"
                    />
                    <button type="submit" className="bg-green-500 text-white p-2">
                        Repay
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AssetsPage;