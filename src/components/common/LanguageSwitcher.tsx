import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormControl, MenuItem } from '@mui/material'; // Import necessary MUI components
import { StyledSelect } from '@components/styled/StyledSelect';
import styles from '@styles/scss/LanguageSwitcher.module.scss';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const languages: any = t('languages', { returnObjects: true });
  const options: any = Object.keys(languages).map((langKey) => ({
    label: languages[langKey],
    value: langKey.toUpperCase()
  }));
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language.toUpperCase());

  useEffect(() => {
    setSelectedLanguage(i18n.language.toUpperCase());
  }, [i18n.language]);

  const changeLanguage = (event: any) => {
    const newLanguage = event.target.value as string;
    i18n.changeLanguage(newLanguage.toLowerCase());
    setSelectedLanguage(newLanguage);
  };

  return (
    <div className={styles.languageSwitcher}>
      <FormControl fullWidth variant="outlined" size="small">
        <StyledSelect
          labelId="language-select-label"
          id="language-select"
          value={selectedLanguage}
          onChange={changeLanguage}
          renderValue={(selected: any) => selected}>
          {options.map((option: any) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </StyledSelect>
      </FormControl>
    </div>
  );
};

export default LanguageSwitcher;
