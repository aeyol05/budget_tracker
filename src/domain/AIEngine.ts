import { Transaction, Forecast, Category, ScheduleEvent } from './models';

export class AIEngine {
  static async categorizeOCR(text: string, categories: Category[]): Promise<{ categoryId: string, amount: number, merchant: string, confidenceScore: number }> {
    // Mock implementations of OCR classification 
    const lowerText = text.toLowerCase();
    
    let amount = 0;
    const amountMatch = text.match(/[\$₱]?([0-9.,]+)/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1].replace(',', ''));
    }

    let merchant = "Unknown Merchant";
    if (lowerText.includes("starbucks") || lowerText.includes("coffee")) merchant = "Starbucks";
    if (lowerText.includes("jollibee")) merchant = "Jollibee";
    if (lowerText.includes("uber") || lowerText.includes("grab")) merchant = "Grab";
    if (lowerText.includes("applestore") || lowerText.includes("apple")) merchant = "Apple Store";

    let categoryId = categories[0].id; // default
    if (merchant === "Starbucks" || merchant === "Jollibee") categoryId = categories.find(c => c.name.includes("Food"))?.id || categoryId;
    if (merchant === "Grab") categoryId = categories.find(c => c.name.includes("Transport"))?.id || categoryId;
    
    return {
      categoryId,
      amount: amount || 100, // mock amount
      merchant,
      confidenceScore: 0.92
    };
  }

  static async parseVoiceEntry(voiceText: string, categories: Category[]): Promise<Partial<Transaction>> {
    const lowerText = voiceText.toLowerCase().replace(/,/g, '');
    const tokens = lowerText.split(/\s+/);
    
    let amount = 0;
    let merchant = "Unknown";
    let categoryId = categories[0]?.id;

    // 1. Extract Amount (look for any number)
    const amountMatch = lowerText.match(/\d+(\.\d+)?/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[0]);
    }

    // 2. Intelligent Merchant Extraction
    // If text like "Milktea 250" - the part that isn't the number is the merchant
    if (tokens.length <= 3 && amount > 0) {
      const merchantToken = tokens.find(t => isNaN(parseFloat(t)));
      if (merchantToken) merchant = merchantToken.charAt(0).toUpperCase() + merchantToken.slice(1);
    } 
    // If more complex like "I spent 150 at Starbucks"
    else if (lowerText.includes("at ")) {
      const parts = lowerText.split("at ");
      const afterAt = parts[1].trim();
      merchant = afterAt.split(" ")[0];
      merchant = merchant.charAt(0).toUpperCase() + merchant.slice(1);
    }

    // 3. Smart Category Mapping
    const foodKeywords = ['milktea', 'ramen', 'starbucks', 'coffee', 'food', 'lunch', 'dinner', 'restaurant', 'jollibee', 'mcdonalds'];
    const transportKeywords = ['grab', 'uber', 'taxi', 'gas', 'fuel', 'fare', 'angkas', 'joyride'];
    const shoppingKeywords = ['lazada', 'shopee', 'mall', 'cloth', 'shoes', 'amazon'];
    const billKeywords = ['meralco', 'wifi', 'internet', 'subscription', 'netflix', 'spotify'];

    const findCat = (keywords: string[], targetName: string) => {
      if (keywords.some(k => lowerText.includes(k))) {
        return categories.find(c => c.name.toLowerCase().includes(targetName))?.id;
      }
      return null;
    };

    const detectedCatId = 
      findCat(foodKeywords, 'food') || 
      findCat(transportKeywords, 'transport') || 
      findCat(shoppingKeywords, 'shop') || 
      findCat(billKeywords, 'bill') ||
      findCat(billKeywords, 'utilities');

    if (detectedCatId) categoryId = detectedCatId;

    return {
      amount,
      categoryId,
      merchant,
      type: 'expense',
      date: new Date().toISOString()
    };
  }

  static async parseScheduleEntry(text: string): Promise<Partial<ScheduleEvent>> {
    const lower = text.toLowerCase();
    
    // Extracted values
    let title = "New Event";
    let date: string | undefined = undefined;
    let startTime = "09:00";
    let endTime = "10:00";
    let category: ScheduleEvent['category'] = 'Personal';
    let attendees: string[] = [];
    let location = "";

    // Specific Date detection
    if (lower.includes("tomorrow")) {
       const d = new Date();
       d.setDate(d.getDate() + 1);
       date = d.toISOString();
    } else if (lower.includes("today")) {
       date = new Date().toISOString();
    }

    // Location extraction
    if (lower.includes(" at ")) {
      const parts = lower.split(" at ");
      const afterAt = parts[1].trim();
      if (!/^\d/.test(afterAt)) {
         location = afterAt.split(/\s+on|\s+with|\s+from/)[0];
      }
    } 
    
    if (!location && lower.includes(" on ")) {
       const parts = lower.split(" on ");
       const candidate = parts[1].trim().split(/\s+at|\s+with|\s+from/)[0];
       const dateWords = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'tomorrow', 'today', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
       if (!dateWords.some(w => candidate.toLowerCase().includes(w))) {
          location = candidate;
       }
    }

    // Title extraction
    if (lower.split(/\s+/).length > 2) {
       title = text.split(/\s+at|\s+on|\s+from/)[0];
    }
    
    if (lower.includes("with ")) {
      const parts = lower.split("with ");
      const afterWith = parts[1].trim();
      const person = afterWith.split(/\s+/)[0];
      attendees.push(person.charAt(0).toUpperCase() + person.slice(1));
    }
    
    // Time extraction
    const timeRegex = /(\d{1,2})(:(\d{2}))?\s*(am|pm)/i;
    const timeMatch = lower.match(timeRegex);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const isPm = timeMatch[4].toLowerCase() === 'pm';
      if (isPm && hour < 12) hour += 12;
      if (!isPm && hour === 12) hour = 0;
      
      startTime = `${hour.toString().padStart(2, '0')}:${timeMatch[3] || '00'}`;
      endTime = `${(hour + 1).toString().padStart(2, '0')}:${timeMatch[3] || '00'}`;
    }

    // Category extraction
    if (lower.includes("dinner") || lower.includes("lunch") || lower.includes("eat") || lower.includes("restaurant") || lower.includes("breakfast")) {
      category = 'Personal';
    } else if (lower.includes("meeting") || lower.includes("work") || lower.includes("sync") || lower.includes("client")) {
      category = 'Work';
    }

    return {
      title: title.charAt(0).toUpperCase() + title.slice(1),
      date,
      startTime,
      endTime,
      category,
      attendees,
      location: location.charAt(0).toUpperCase() + location.slice(1)
    };
  }

  static async generateForecast(transactions: Transaction[], currentBalance: number): Promise<Forecast> {
    // Simple predictive model mock based on historical
    let totalExpense = 0;
    transactions.filter(t => t.type === 'expense').forEach(t => totalExpense += t.amount);
    
    // Simulate end of month run rate
    const daysInMonth = 30;
    const currentDay = new Date().getDate();
    const dailyBurnRate = totalExpense / Math.max(1, currentDay);
    const projectedTotalExpense = dailyBurnRate * daysInMonth;
    
    const endOfMonthBalance = currentBalance - (projectedTotalExpense - totalExpense);

    return {
      projectedBalance: endOfMonthBalance,
      endOfMonthBalance,
      overspendingRisk: projectedTotalExpense > 5000 ? ["High risk of overspending in Food & Drinks"] : [],
      categoryOverspendWarnings: ["Food & Drinks: 18% over budget projection"],
      suggestedSavings: endOfMonthBalance > 0 ? endOfMonthBalance * 0.2 : 0
    };
  }
}
