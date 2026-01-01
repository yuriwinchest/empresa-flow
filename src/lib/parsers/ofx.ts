
export interface OFXTransaction {
    fitId: string;
    type: 'credit' | 'debit';
    date: Date;
    amount: number;
    description: string;
    memo?: string;
}

export async function parseOFX(file: File): Promise<OFXTransaction[]> {
    const text = await file.text();
    const transactions: OFXTransaction[] = [];

    // Regex to find STMTTRN blocks
    const blockRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
    let match;

    while ((match = blockRegex.exec(text)) !== null) {
        const block = match[1];

        const getTag = (tag: string) => {
            const regex = new RegExp(`<${tag}>(.*?)(\r|\n|<)`);
            const m = regex.exec(block);
            return m ? m[1].trim() : null;
        };

        const fitId = getTag('FITID');
        const dtPosted = getTag('DTPOSTED');
        const trnAmt = getTag('TRNAMT');
        const name = getTag('NAME');
        const memo = getTag('MEMO');

        if (fitId && dtPosted && trnAmt) {
            // Parse Date: YYYYMMDD...
            // Standard OFX date format: YYYYMMDDHHMMSS.XXX[gmt offset:tz name]
            // We just need the date part
            try {
                const year = parseInt(dtPosted.substring(0, 4));
                const month = parseInt(dtPosted.substring(4, 6)) - 1; // 0-indexed
                const day = parseInt(dtPosted.substring(6, 8));
                const date = new Date(year, month, day);

                // Parse Amount
                // Replace comma with dot just in case, though standard is dot
                const amountVal = parseFloat(trnAmt.replace(',', '.'));

                // Determine type based on amount sign
                const type: 'credit' | 'debit' = amountVal < 0 ? 'debit' : 'credit';

                transactions.push({
                    fitId,
                    type,
                    date,
                    amount: Math.abs(amountVal), // Store positive amount
                    description: name || memo || 'Transação Bancária',
                    memo: memo || undefined
                });
            } catch (e) {
                console.warn('Error parsing OFX transaction line', e);
            }
        }
    }

    return transactions;
}
