import { redirect } from 'next/navigation';

export default function MonthlyCalendarRedirectPage() {
    redirect('/admin/calendar?view=month');
}
