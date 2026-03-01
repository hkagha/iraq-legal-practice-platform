import React, { Component, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Frown, RotateCcw, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends Component<Props & { t: (k: string) => string; isRTL: boolean }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6" dir={this.props.isRTL ? 'rtl' : 'ltr'}>
          <div className="text-center max-w-md space-y-6">
            <Frown className="h-16 w-16 text-muted-foreground mx-auto" />
            <h1 className="text-heading-lg text-foreground">{t('errors.somethingWentWrong')}</h1>
            <p className="text-body-md text-muted-foreground">{t('errors.unexpectedError')}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleRetry} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                {t('common.retry')}
              </Button>
              <Button variant="outline" asChild className="gap-2">
                <a href="mailto:support@qanuni.app">
                  <Mail className="h-4 w-4" />
                  {t('errors.reportIssue')}
                </a>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ErrorBoundary({ children }: Props) {
  const { t, isRTL } = useLanguage();
  return <ErrorBoundaryInner t={t} isRTL={isRTL}>{children}</ErrorBoundaryInner>;
}
