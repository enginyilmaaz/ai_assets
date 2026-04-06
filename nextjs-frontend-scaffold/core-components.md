# Core Components Reference

All these components are created in EVERY project (both simple and full scale).

## 1. CustomTextField — `src/@core/components/mui/text-field/index.tsx`

```tsx
import { forwardRef } from 'react';
import { styled } from '@mui/material/styles';
import TextField, { TextFieldProps } from '@mui/material/TextField';

export const TextFieldStyled = styled(TextField)<TextFieldProps>(({ theme }) => ({
  alignItems: 'flex-start',
  '& .MuiInputLabel-root': {
    transform: 'none',
    lineHeight: 1.154,
    position: 'relative',
    marginBottom: theme.spacing(1),
    fontSize: theme.typography.body2.fontSize,
    color: '#757575 !important',
  },
  '& .MuiInputBase-root': {
    paddingRight: 0,
    borderRadius: 8,
    backgroundColor: 'transparent !important',
    border: '1px solid rgba(47, 43, 61, 0.2)',
    transition: theme.transitions.create(['border-color', 'box-shadow'], {
      duration: theme.transitions.duration.shorter,
    }),
    '&:not(.Mui-focused):not(.Mui-disabled):not(.Mui-error):hover': {
      borderColor: 'rgba(47, 43, 61, 0.28)',
    },
    '&:before, &:after': { display: 'none' },
    '&.MuiInputBase-sizeSmall': { borderRadius: 6 },
    '&.Mui-error': { borderColor: theme.palette.error.main },
    '&.Mui-focused': {
      boxShadow: theme.shadows[2],
      '&.MuiInputBase-colorPrimary': { borderColor: theme.palette.primary.main },
      '&.Mui-error': { borderColor: theme.palette.error.main },
    },
    '&.Mui-disabled': { backgroundColor: theme.palette.action.selected },
    '& .MuiInputAdornment-root': { marginTop: '0 !important' },
  },
  '& .MuiInputBase-input': {
    color: '#000000',
    fontSize: '14px',
    '&:not(textarea)': { padding: '15.5px 13px' },
    '&:not(textarea).MuiInputBase-inputSizeSmall': { padding: '7.5px 13px' },
    '&.MuiInputBase-inputAdornedStart:not(.MuiAutocomplete-input)': { paddingLeft: 0 },
    '&.MuiInputBase-inputAdornedEnd:not(.MuiAutocomplete-input)': { paddingRight: 0 },
  },
  '& .MuiFormHelperText-root': {
    lineHeight: 1.154,
    margin: theme.spacing(1, 0, 0),
    color: theme.palette.text.secondary,
    fontSize: theme.typography.body2.fontSize,
    '&.Mui-error': { color: theme.palette.error.main },
  },
  '& .MuiSelect-select:focus, & .MuiNativeSelect-select:focus': { backgroundColor: 'transparent' },
  '& .MuiAutocomplete-input': {
    paddingLeft: '6px !important',
    paddingTop: '7.5px !important',
    paddingBottom: '7.5px !important',
    '&.MuiInputBase-inputSizeSmall': {
      paddingLeft: '6px !important',
      paddingTop: '2.5px !important',
      paddingBottom: '2.5px !important',
    },
  },
  '& .MuiAutocomplete-inputRoot': {
    paddingTop: '8px !important',
    paddingLeft: '8px !important',
    paddingBottom: '8px !important',
    '&.MuiInputBase-sizeSmall': {
      paddingTop: '5px !important',
      paddingLeft: '5px !important',
      paddingBottom: '5px !important',
    },
  },
  '& .MuiInputBase-multiline': {
    padding: '15.25px 13px',
    '&.MuiInputBase-sizeSmall': { padding: '7.25px 13px' },
  },
}));

const CustomTextField = forwardRef((props: TextFieldProps, ref) => {
  const { size = 'small', InputLabelProps, ...rest } = props;

  return (
    <TextFieldStyled
      size={size}
      inputRef={ref}
      {...rest}
      variant="filled"
      InputLabelProps={{ ...InputLabelProps, shrink: true }}
    />
  );
});

export default CustomTextField;
```

## 2. CustomAutocomplete — `src/@core/components/mui/autocomplete/index.tsx`

```tsx
import { ElementType, forwardRef } from 'react';
import Paper from '@mui/material/Paper';
import Autocomplete, { AutocompleteProps } from '@mui/material/Autocomplete';

const CustomAutocomplete = forwardRef(
  <
    T,
    Multiple extends boolean | undefined,
    DisableClearable extends boolean | undefined,
    FreeSolo extends boolean | undefined,
    ChipComponent extends ElementType
  >(
    props: AutocompleteProps<T, Multiple, DisableClearable, FreeSolo, ChipComponent>,
    ref: any
  ) => {
    return (
      <Autocomplete
        {...props}
        ref={ref}
        PaperComponent={paperProps => <Paper {...paperProps} className='custom-autocomplete-paper' />}
      />
    );
  }
) as typeof Autocomplete;

export default CustomAutocomplete;
```

## 3. GridTable — `src/@core/components/data-grid/index.tsx`

```tsx
import { DataGrid, GridColDef, GridSortModel, GridRowSelectionModel, DataGridProps } from '@mui/x-data-grid';
import { Box, Typography } from '@mui/material';

interface GridTableProps {
  loading: boolean;
  columns: GridColDef[];
  rowCount: number;
  data: any[];
  page?: number;
  showCheckBoxSelection?: boolean;
  rowSelectionModel?: GridRowSelectionModel;
  onRowSelectionModelChange?: (ids: GridRowSelectionModel) => void;
  setCurrentPage?: (page: number) => void;
  setQueryOptions?: (sortValue: GridSortModel) => void;
  itemPerPage?: number;
  setItemPerPage?: (value: number) => void;
  slots?: DataGridProps['slots'];
  slotProps?: DataGridProps['slotProps'];
}

const NoRecordOverlay = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
    <Typography>No records found</Typography>
  </Box>
);

const GridTable = ({
  data = [],
  columns,
  rowCount = 0,
  loading,
  page = 1,
  setCurrentPage,
  setQueryOptions,
  itemPerPage = 10,
  setItemPerPage,
  showCheckBoxSelection = false,
  rowSelectionModel,
  onRowSelectionModelChange,
  slots,
  slotProps,
}: GridTableProps) => {
  return (
    <DataGrid
      rows={data}
      columns={columns}
      rowCount={rowCount}
      loading={loading}
      paginationMode="server"
      sortingMode="server"
      paginationModel={{ page: page - 1, pageSize: itemPerPage }}
      onPaginationModelChange={(model) => {
        setCurrentPage?.(model.page + 1);
        setItemPerPage?.(model.pageSize);
      }}
      onSortModelChange={(model) => setQueryOptions?.(model)}
      pageSizeOptions={[5, 10, 25, 50]}
      checkboxSelection={showCheckBoxSelection}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionModelChange={onRowSelectionModelChange}
      disableRowSelectionOnClick
      autoHeight
      slots={{
        noRowsOverlay: NoRecordOverlay,
        noResultsOverlay: NoRecordOverlay,
        ...slots,
      }}
      slotProps={slotProps}
      sx={{
        border: 'none',
        '& .MuiDataGrid-columnHeaders': {
          backgroundColor: '#F3F4F6',
          borderRadius: '8px',
        },
        '& .MuiDataGrid-row': { minHeight: '60px !important' },
        '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
      }}
    />
  );
};

export default GridTable;
```

## 4. OptionsMenu — `src/@core/components/option-menu/index.tsx`

```tsx
import { MouseEvent, useState, ReactNode } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { OptionType, OptionsMenuType, OptionMenuItemType } from './types';

export const MenuItemWrapper = ({ children, option }: { children: ReactNode; option: OptionMenuItemType }) => {
  if (option.href) {
    return (
      <Box component={Link} href={option.href} {...option.linkProps}
        sx={{ px: 4, py: 1.5, width: '100%', display: 'flex', color: 'inherit', alignItems: 'center', textDecoration: 'none' }}>
        {children}
      </Box>
    );
  }

  return <>{children}</>;
};

const OptionsMenu = (props: OptionsMenuType) => {
  const { icon, options, menuProps, iconButtonProps } = props;
  if (options.length === 0) return null;

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton aria-haspopup="true" onClick={handleClick} {...iconButtonProps}>
        {icon || <MoreVertIcon fontSize="small" />}
      </IconButton>
      <Menu keepMounted anchorEl={anchorEl} onClose={handleClose} open={Boolean(anchorEl)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        {...menuProps}>
        {options.map((option: OptionType, index: number) => {
          if (typeof option === 'string') {
            return <MenuItem key={index} onClick={handleClose}>{option}</MenuItem>;
          } else if ('divider' in option) {
            return option.divider && <Divider key={index} {...option.dividerProps} />;
          } else {
            return (
              <MenuItem key={index} {...option.menuItemProps} {...(option.href && { sx: { p: 0 } })}
                onClick={(e) => { handleClose(e); option.menuItemProps?.onClick?.(e); }}>
                <MenuItemWrapper option={option}>
                  {option.icon ? option.icon : null}
                  {option.text}
                </MenuItemWrapper>
              </MenuItem>
            );
          }
        })}
      </Menu>
    </>
  );
};

export default OptionsMenu;
```

### OptionsMenu Types — `src/@core/components/option-menu/types.ts`

```typescript
import { ReactNode } from 'react';
import { IconButtonProps } from '@mui/material/IconButton';
import { MenuProps } from '@mui/material/Menu';
import { MenuItemProps } from '@mui/material/MenuItem';
import { DividerProps } from '@mui/material/Divider';
import { LinkProps } from 'next/link';

export type OptionDividerType = { divider: boolean; dividerProps?: DividerProps };

export type OptionMenuItemType = {
  text: ReactNode;
  icon?: ReactNode;
  href?: string;
  linkProps?: Omit<LinkProps, 'href'>;
  menuItemProps?: MenuItemProps;
};

export type OptionType = string | OptionDividerType | OptionMenuItemType;

export type OptionsMenuType = {
  icon?: ReactNode;
  options: OptionType[];
  leftAlignMenu?: boolean;
  iconButtonProps?: IconButtonProps;
  iconProps?: any;
  menuProps?: Partial<MenuProps>;
};
```

## 5. DialogConfirm — `src/@core/components/dialog-confirm/index.tsx`

```tsx
import { FC, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button, Dialog, DialogActions, DialogContent, Typography, Box, TextField, CircularProgress,
} from '@mui/material';
import CustomCloseButton from 'src/@core/components/custom-close-button';

interface DialogConfirmProps {
  setShow: (value: boolean) => void;
  show: boolean;
  contentBody?: string;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  title?: string;
  type?: 'warning' | 'confirm';
  confirmCode?: boolean;
}

export const DialogConfirm: FC<DialogConfirmProps> = ({
  setShow, show, title, contentBody, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel',
  type = 'warning', confirmCode = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const { register, handleSubmit, setError, reset, watch, formState: { errors } } = useForm<{ code: string }>();

  const generateRandomCode = () => Math.floor(1000 + Math.random() * 9000).toString();

  useEffect(() => {
    if (show) { setConfirmationCode(generateRandomCode()); reset(); }
  }, [show, reset]);

  const handleConfirm = async (data: { code: string }) => {
    if (data.code !== confirmationCode) {
      setError('code', { type: 'manual', message: 'Incorrect code' });

      return;
    }
    setLoading(true);
    try { await onConfirm?.(); } catch (e) { console.error(e); }
    setTimeout(() => { setLoading(false); setShow(false); }, 200);
  };

  const handleConfirmWithoutCode = async () => {
    setLoading(true);
    try { await onConfirm?.(); } catch (e) { console.error(e); }
    setTimeout(() => { setLoading(false); setShow(false); }, 200);
  };

  return (
    <Dialog fullWidth open={show} maxWidth="sm" onClose={() => setShow(false)}>
      <DialogContent sx={{ pt: 6, pb: 4, px: 3 }}>
        <CustomCloseButton onClick={() => setShow(false)} />
        <Box textAlign="center">
          <Typography sx={{ fontWeight: 500, fontSize: confirmCode ? '1rem' : '1.5rem', mt: 2, mb: 1 }}>
            {title || 'Are you sure?'}
          </Typography>

          {confirmCode ? (
            <form onSubmit={handleSubmit(handleConfirm)}>
              <Typography sx={{ fontSize: '15px', fontWeight: 500, mt: 3 }}>
                Type the code to confirm: <strong>{confirmationCode}</strong>
              </Typography>
              <TextField fullWidth sx={{ mt: 3, mb: 3, width: '60%' }} variant="outlined" size="small"
                placeholder="Type here" {...register('code', { required: 'Enter code', minLength: { value: 4, message: '4 digits' }, maxLength: { value: 4, message: '4 digits' }, pattern: { value: /^[0-9]{4}$/, message: 'Numbers only' } })}
                error={!!errors.code} helperText={errors.code?.message}
                inputProps={{ maxLength: 4, inputMode: 'numeric', pattern: '[0-9]*' }} />
              <DialogActions sx={{ justifyContent: 'center' }}>
                <Button variant="outlined" onClick={() => setShow(false)} disabled={loading}>{cancelText}</Button>
                <Button type="submit" variant="contained" disabled={loading || !watch('code') || watch('code') !== confirmationCode}>
                  {loading ? <CircularProgress size={22} color="inherit" /> : confirmText}
                </Button>
              </DialogActions>
            </form>
          ) : (
            <>
              <Typography sx={{ fontSize: '18px', mt: 3 }}>{contentBody}</Typography>
              <DialogActions sx={{ justifyContent: 'center', mt: 4 }}>
                <Button variant="outlined" onClick={() => setShow(false)} disabled={loading}>{cancelText}</Button>
                <Button variant="contained" color={type === 'warning' ? 'error' : 'primary'} onClick={handleConfirmWithoutCode}>
                  {loading ? <CircularProgress size={22} color="inherit" /> : confirmText}
                </Button>
              </DialogActions>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
```

## 6. CustomChip — `src/@core/components/mui/chip/index.tsx`

```tsx
import MuiChip, { ChipProps } from '@mui/material/Chip';

interface CustomChipProps extends ChipProps {
  skin?: 'light' | 'filled';
  rounded?: boolean;
}

const CustomChip = (props: CustomChipProps) => {
  const { sx, skin, color, rounded, ...rest } = props;

  return (
    <MuiChip
      {...rest}
      variant="filled"
      color={color}
      sx={{
        ...(rounded && { borderRadius: '4px' }),
        ...(skin === 'light' && { opacity: 0.85 }),
        ...sx,
      }}
    />
  );
};

export default CustomChip;
```

## 7. CustomSnackbar — `src/@core/components/customSnackbar/CustomSnackbar.tsx`

```tsx
import { useEffect, useState } from 'react';
import { Alert, Snackbar, LinearProgress, AlertColor } from '@mui/material';

interface CustomSnackbarProps {
  open: boolean;
  message: string;
  severity: AlertColor;
  onClose: () => void;
  autoHideDuration?: number;
}

const CustomSnackbar = ({ open, message, severity, onClose, autoHideDuration = 4000 }: CustomSnackbarProps) => {
  const [progress, setProgress] = useState(100);
  const shouldAutoClose = severity === 'success' || severity === 'info';

  useEffect(() => {
    if (!open || !shouldAutoClose) { setProgress(100); return; }
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) { clearInterval(interval); onClose(); return 0; }

        return prev - (100 / (autoHideDuration / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [open, shouldAutoClose, autoHideDuration, onClose]);

  return (
    <Snackbar open={open} onClose={shouldAutoClose ? onClose : undefined}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }} sx={{ mt: '75px' }}>
      <Alert onClose={onClose} severity={severity} sx={{ width: '100%', position: 'relative', overflow: 'hidden' }}>
        {message}
        {shouldAutoClose && (
          <LinearProgress variant="determinate" value={progress} color={severity}
            sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 }} />
        )}
      </Alert>
    </Snackbar>
  );
};

export default CustomSnackbar;
```

## 8. Spinner — `src/@core/components/spinner/index.tsx`

```tsx
import { Box, CircularProgress } from '@mui/material';

const Spinner = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);

export default Spinner;
```

## 9. PageHeader — `src/@core/components/page-header/index.tsx`

```tsx
import { ReactNode } from 'react';
import { Grid, Typography } from '@mui/material';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
}

const PageHeader = ({ title, subtitle }: PageHeaderProps) => (
  <Grid item xs={12}>
    <Typography variant="h5">{title}</Typography>
    {subtitle && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{subtitle}</Typography>}
  </Grid>
);

export default PageHeader;
```

## 10. CustomCloseButton — `src/@core/components/custom-close-button/index.tsx`

```tsx
import { styled } from '@mui/material/styles';
import IconButton, { IconButtonProps } from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

const StyledCloseButton = styled(IconButton)<IconButtonProps>(({ theme }) => ({
  top: 0,
  right: 0,
  position: 'absolute',
  color: theme.palette.grey[500],
  transform: 'translate(10px, -10px)',
  borderRadius: 8,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[2],
  transition: 'transform 0.25s ease-in-out, box-shadow 0.25s ease-in-out',
  '&:hover': {
    transform: 'translate(7px, -5px)',
    backgroundColor: theme.palette.background.paper,
  },
}));

const CustomCloseButton = (props: IconButtonProps) => (
  <StyledCloseButton {...props}>
    <CloseIcon fontSize="small" />
  </StyledCloseButton>
);

export default CustomCloseButton;
```

## 11. Icon Component — `src/@core/components/icon/index.tsx`

If using `@iconify/react`:
```tsx
import { Icon as IconifyIcon, IconProps } from '@iconify/react';

const Icon = (props: IconProps) => <IconifyIcon {...props} />;

export default Icon;
```

If NOT using iconify (simpler), just re-export MUI icons or skip this file.
